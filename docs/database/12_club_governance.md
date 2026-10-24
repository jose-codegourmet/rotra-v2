# 12 — Club Governance (Applications, Demotions, Complaints, Admin Audit)

## Overview

This document covers platform-level tables for **creating clubs through admin-reviewed applications**, **demoting or transferring club ownership**, **member complaints to admins**, **admin-only notifications**, and the **immutable admin action log**. These replace the legacy single-table `club_owner_applications` model (see migration notes in [`08_admin.md`](08_admin.md)).

**Product rules (summary):**

- Each **new club** requires a player-submitted **`club_applications`** row reviewed in the Admin app. Approval inserts a `clubs` row and links it via `resulting_club_id`.
- A player may own **unlimited** clubs over time; each creation path goes through an application.
- **Club names may duplicate** across the platform; disambiguation is by location and `clubs.id`.
- **Clubs are never hard-deleted** — demotion and closure use `clubs.status = 'archived'`.
- **`complaints`** is a separate table from **`moderation_flags`** (automated / moderation queue vs member-initiated reports to admins).

RLS patterns for these tables are summarized in [`09_rls_and_realtime.md`](09_rls_and_realtime.md).

---

## Enums

```sql
-- Extends application_status_enum from 08_admin / Prisma (add values in a migration)
ALTER TYPE application_status_enum ADD VALUE IF NOT EXISTS 'cancelled';
-- Optional UI-only value for queue display (no claim/lock semantics in MVP)
ALTER TYPE application_status_enum ADD VALUE IF NOT EXISTS 'in_review';
```

```sql
CREATE TYPE expected_player_bucket_enum AS ENUM (
  'one_to_ten',
  'eleven_to_twentyfive',
  'twentysix_to_fifty',
  'fiftyone_to_hundred',
  'hundred_plus'
);

CREATE TYPE application_rejection_reason_enum AS ENUM (
  'insufficient_information',
  'unverifiable_venue',
  'unverifiable_contact',
  'duplicate_or_squatting',
  'policy_violation',
  'spam_or_low_quality',
  'applicant_history',
  'other'
);

CREATE TYPE demotion_status_enum AS ENUM (
  'pending',
  'approved_archived',
  'approved_transferred',
  'rejected'
);

CREATE TYPE demotion_rejection_reason_enum AS ENUM (
  'insufficient_evidence',
  'already_resolved',
  'out_of_scope',
  'other'
);

CREATE TYPE demotion_requester_role_enum AS ENUM (
  'owner_self',   -- voluntary step-down (auto-approved path)
  'member',       -- escalated from complaint
  'admin'         -- admin-initiated one-click demote
);

CREATE TYPE complaint_target_type_enum AS ENUM (
  'club',
  'club_owner',
  'que_master',
  'session',
  'player'
);

CREATE TYPE complaint_status_enum AS ENUM (
  'pending',
  'dismissed',
  'escalated',
  'resolved'
);

CREATE TYPE admin_notification_type_enum AS ENUM (
  'new_club_application',
  'new_demotion_request',
  'new_complaint',
  'new_moderation_flag',
  'platform_announcement',
  'admin_profile_changed',
  'tester_invite_sent',
  'tag_definition_changed'
);

CREATE TYPE admin_action_enum AS ENUM (
  'application_approved',
  'application_rejected',
  'demotion_approved_archived',
  'demotion_approved_transferred',
  'demotion_rejected',
  'complaint_dismissed',
  'complaint_escalated',
  'complaint_resolved',
  'moderation_flag_resolved',
  'moderation_flag_dismissed',
  'kill_switch_toggled',
  'platform_config_updated',
  'club_manual_archived',
  'club_manual_demoted',
  'admin_invited',
  'admin_invite_resent',
  'admin_activated',
  'admin_deactivated',
  'admin_reactivated',
  'admin_role_changed',
  'admin_force_signed_out',
  'tester_invited',
  'tester_invite_resent',
  'tester_invite_revoked',
  'tag_definition_created',
  'tag_definition_updated',
  'tag_definition_deactivated'
);

CREATE TYPE admin_action_entity_enum AS ENUM (
  'club_application',
  'club_demotion_request',
  'complaint',
  'moderation_flag',
  'kill_switch',
  'platform_config',
  'club',
  'profile',
  'admin_user',
  'tester_invitation',
  'tag_definition'
);
```

### `membership_action_enum` extension

Append to the enum in [`02_clubs.md`](02_clubs.md):

```sql
ALTER TYPE membership_action_enum ADD VALUE IF NOT EXISTS 'ownership_revoked';
```

Used when a club is archived after demotion without ownership transfer, or when documenting owner removal from control while membership row is updated.

---

## Table: `club_applications`

Players apply **per proposed club**. The club row does not exist until an admin approves.

```sql
CREATE TABLE club_applications (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  club_name           text NOT NULL,
  description         text NOT NULL,
  intent              text NOT NULL,

  location_city       text NOT NULL,
  location_venue      text NOT NULL,
  venue_address       text NOT NULL,

  facebook_page_url     text,
  facebook_profile_url  text,
  contact_number          text,

  expected_player_count expected_player_bucket_enum NOT NULL,
  additional_notes      text,

  status application_status_enum NOT NULL DEFAULT 'pending',

  rejection_reason application_rejection_reason_enum,
  review_note      text,
  reviewed_by      uuid REFERENCES profiles(id),
  reviewed_at      timestamptz,

  resulting_club_id uuid UNIQUE REFERENCES clubs(id),

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
```

### Constraints (application layer)

| Rule | Detail |
|------|--------|
| One pending per player | At most one row with `status = 'pending'` per `player_id` (not enforced by a partial unique index in MVP — enforced in API). |
| Edits while pending | Applicant may update fields while `status = 'pending'`. Each successful update sets `updated_at = now()`. |
| Cancel | Applicant may set `status = 'cancelled'` to withdraw; frees the “one pending” slot. |
| SLA auto-reject | If `status = 'pending'` and `updated_at` is older than **24 hours** without admin decision, a scheduled job sets `status = 'rejected'`, `rejection_reason = 'other'`, and `review_note` explaining SLA timeout; notifies applicant (`club_application_rejected`). Each edit **resets** the 24h window from `updated_at`. |

### Approval flow

1. Admin approves → insert `clubs` with `owner_id = player_id`, copy `club_name` / `description` from application, set `status = 'active'`, **`auto_approve = true`**, **`invite_link_enabled = true`**, generate **`invite_token`** + `invite_token_created_at` (same pattern as [`02_clubs.md`](02_clubs.md)). *Product note: default `auto_approve` may be changed to `false` in a later pass if join approval should start closed.*
2. Set `club_applications.status = 'approved'`, `reviewed_by`, `reviewed_at`, `resulting_club_id`.
3. Trigger `handle_new_club()` inserts owner into `club_members` with `role = 'owner'`.
4. Insert `notifications` row(s): `club_application_approved` (and optional `club_application_submitted` on first submit only — product choice).

### Rejection flow

1. Admin selects **required** `rejection_reason` from enum + optional `review_note` (shown to player).
2. `status = 'rejected'`, `reviewed_by`, `reviewed_at`.
3. Notify: `club_application_rejected`.

### Indexes

```sql
CREATE INDEX idx_club_applications_player_id ON club_applications(player_id);
CREATE INDEX idx_club_applications_status     ON club_applications(status);
CREATE INDEX idx_club_applications_created   ON club_applications(created_at DESC);
CREATE INDEX idx_club_applications_updated   ON club_applications(updated_at DESC)
  WHERE status = 'pending';
```

---

## Table: `complaints`

Member-initiated reports **to platform admins**. Distinct from `moderation_flags` (profanity / automated / moderation queue).

Define **before** `club_demotion_requests` so `linked_complaint_id` can reference `complaints`. The optional reverse link `complaints.escalated_to_demotion_id` is added in a **second migration step** after `club_demotion_requests` exists (avoids circular FK at create time).

```sql
CREATE TABLE complaints (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  target_type  complaint_target_type_enum NOT NULL,
  target_id    uuid NOT NULL,

  reason       text NOT NULL,
  context      text,

  status complaint_status_enum NOT NULL DEFAULT 'pending',

  reviewed_by   uuid REFERENCES profiles(id),
  review_note   text,
  reviewed_at   timestamptz,

  escalated_to_demotion_id uuid UNIQUE,  -- FK added in migration 2: REFERENCES club_demotion_requests(id)

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
```

### Rules

- **Only active members** of the relevant club may file complaints whose targets are scoped to that club (club, club owner, que master, session, or another player in that context). Enforced in application logic.
- **No deduplication** — unlimited rows; admins filter duplicates.
- **No notification** to the complainant when a complaint is dismissed or resolved (by product choice).
- **Escalation:** admin creates a `club_demotion_requests` row, sets `complaints.status = 'escalated'`, sets `escalated_to_demotion_id` after the demotion row exists.

### Indexes

```sql
CREATE INDEX idx_complaints_target ON complaints(target_type, target_id);
CREATE INDEX idx_complaints_reporter ON complaints(reporter_id);
CREATE INDEX idx_complaints_status   ON complaints(status);
CREATE INDEX idx_complaints_created  ON complaints(created_at DESC);
```

**Migration 2** (after `club_demotion_requests` exists): add the FK from `complaints.escalated_to_demotion_id` to `club_demotion_requests(id)`.

---

## Table: `club_demotion_requests`

Governs **loss of ownership for one club** (demotion is scoped per club; other clubs the same player owns are unaffected).

```sql
CREATE TABLE club_demotion_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  target_owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  requester_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requester_role  demotion_requester_role_enum NOT NULL,

  reason            text NOT NULL,
  evidence_url      text,
  linked_complaint_id uuid UNIQUE REFERENCES complaints(id),

  status             demotion_status_enum NOT NULL DEFAULT 'pending',
  rejection_reason   demotion_rejection_reason_enum,
  resolution_note    text,

  transferred_to_id uuid REFERENCES profiles(id),

  reviewed_by   uuid REFERENCES profiles(id),
  reviewed_at   timestamptz,

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
```

### Requester roles

| Value | Meaning |
|-------|---------|
| `owner_self` | Voluntary step-down; **auto-approved** path (row may be created already resolved per product spec). |
| `member` | Escalated from a `complaints` row. |
| `admin` | Admin one-click demote or initiated review. |

### Resolution: transfer

1. Admin picks **new owner** from active **Que Masters** first, then any **active member** (dropdown in Admin UI).
2. Update `clubs.owner_id` to new owner.
3. Old owner’s `club_members.role`: `'owner'` → `'member'` (they **remain a member**).
4. New owner’s `club_members.role` updated to `'owner'`.
5. `club_demotion_requests.status = 'approved_transferred'`.
6. Log `ownership_transferred` on `club_membership_audit_log`.
7. Notifications: `club_demotion_completed` to former owner; optional “you are now owner” type in a future enum.

### Resolution: archive

1. Set `clubs.status = 'archived'`.
2. `club_demotion_requests.status = 'approved_archived'`.
3. Log `ownership_revoked` (and/or `ownership_transferred` if documenting differently — align with app).
4. **All club members** receive `club_closed` notification.

### Rejection

`status = 'rejected'` with `demotion_rejection_reason_enum` + optional `resolution_note`.

### Indexes

```sql
CREATE INDEX idx_demotion_club_id    ON club_demotion_requests(club_id);
CREATE INDEX idx_demotion_target_id   ON club_demotion_requests(target_owner_id);
CREATE INDEX idx_demotion_status      ON club_demotion_requests(status);
CREATE INDEX idx_demotion_created     ON club_demotion_requests(created_at DESC);
```

---

## Table: `admin_notifications`

In-app inbox for **admin users** (separate from player `notifications`).

```sql
CREATE TABLE admin_notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  type       admin_notification_type_enum NOT NULL,
  severity   notification_severity_enum NOT NULL DEFAULT 'info',
  target_url text NOT NULL,
  title      text NOT NULL,
  body       text,

  broadcast_id uuid REFERENCES notification_broadcasts(id) ON DELETE SET NULL,

  read_at    timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);
```

- Populated when new applications, demotions, complaints, or moderation flags need admin attention; also via **broadcast fan-out** (`platform_announcement`, `admin_profile_changed`) — see [`07_notifications.md`](07_notifications.md).
- **MVP delivery:** fetch list + unread count when the admin opens the dropdown or `/admin/notifications` (no Realtime requirement).
- Client app `notifications` continues to use Realtime per [`07_notifications.md`](07_notifications.md).

### Indexes

```sql
CREATE INDEX idx_admin_notif_admin_unread ON admin_notifications(admin_id, read_at);
CREATE INDEX idx_admin_notif_created     ON admin_notifications(created_at DESC);
CREATE INDEX idx_admin_notif_broadcast ON admin_notifications(broadcast_id);
```

---

## Table: `admin_action_log`

Append-only log of **admin write actions** (and one-click demotes). Used for compliance and debugging.

```sql
CREATE TABLE admin_action_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL REFERENCES profiles(id),

  action      admin_action_enum NOT NULL,
  entity_type admin_action_entity_enum NOT NULL,
  entity_id   uuid NOT NULL,

  before_value jsonb,
  after_value  jsonb,
  note         text,

  created_at   timestamptz NOT NULL DEFAULT now()
);
```

### Logged operations (non-exhaustive)

- Approve / reject `club_applications`
- Approve / reject `club_demotion_requests`
- Dismiss / escalate / resolve `complaints`
- Resolve / dismiss `moderation_flags`
- Toggle `kill_switches`, update `platform_config`
- One-click `club_manual_demoted` / `club_manual_archived`

**Storage:** `before_value` / `after_value` are **not size-capped** in documentation; implement with `jsonb` as-is. A future cron may prune old rows.

### Indexes

```sql
CREATE INDEX idx_admin_log_admin    ON admin_action_log(admin_id);
CREATE INDEX idx_admin_log_entity   ON admin_action_log(entity_type, entity_id);
CREATE INDEX idx_admin_log_created  ON admin_action_log(created_at DESC);
```

---

## Relationship diagram (conceptual)

```
profiles ──► club_applications (applicant)
profiles ──► club_applications (reviewer)
clubs    ◄── club_applications (resulting_club_id)

profiles ──► club_demotion_requests (requester, target_owner, transferred_to, reviewer)
clubs    ──► club_demotion_requests
complaints ──► club_demotion_requests (linked_complaint_id)

profiles ──► complaints (reporter, reviewer)
profiles ──► admin_notifications (admin recipient)
profiles ──► admin_action_log (admin actor)
```

---

## Cross-references

- Club entity, membership, audit log: [`02_clubs.md`](02_clubs.md)
- Player notification types: [`07_notifications.md`](07_notifications.md)
- Kill switches, platform config, moderation flags: [`08_admin.md`](08_admin.md)
- RLS: [`09_rls_and_realtime.md`](09_rls_and_realtime.md)
