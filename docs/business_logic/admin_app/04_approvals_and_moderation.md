# Admin App — 04 Approvals & Moderation

## Overview

The Admin App handles human review for:

1. **Club applications** — players requesting a new `clubs` row (per-club approval).
2. **Club demotion requests** — ownership transfer, archive, voluntary step-down, or admin-initiated demotion.
3. **Member complaints** — `complaints` table (separate from automated `moderation_flags`).
4. **Platform moderation** — flagged reviews, account actions, content removal (`moderation_flags` and related flows).

Database reference: [`../../database/12_club_governance.md`](../../database/12_club_governance.md). Client role context: [`../client_app/02_user_roles.md`](../client_app/02_user_roles.md) §2.2.

---

## Part A1: Club applications

### Queue

- Routes under **`/admin/approvals/club-applications`** (tab within Approvals).
- Columns: applicant, contact/verification fields, club name, location (city, venue, address), intent, expected size bucket, submitted / **SLA countdown** (time until auto-reject from `updated_at`), status (`pending`, `in_review`, `approved`, `rejected`, `cancelled`).
- **Default sort:** newest first; filters include **pending**, **longest waiting**, and status filters.
- **Collision warning:** when reviewing, show other clubs with the same or similar name (city, owner, status, approved date) so admins can spot squatting or confusion.
- **Bulk actions:** **bulk reject** (shared rejection reason + note), **export CSV**. **No bulk approve** — each approval mints a club and must be individually confirmed.
- **Reject:** admin must pick a value from **`application_rejection_reason_enum`** plus optional free-text note shown to the player.
- **Approve:** inserts `clubs`, sets `resulting_club_id`, notifies `club_application_approved`. Defaults for minted club: `auto_approve = true`, `invite_link_enabled = true`, invite token generated (see doc 12).

### Rules

- At most **one `pending` application per player** (enforced in API).
- Applicant may **edit** while `pending` (each edit resets **24h SLA** on `updated_at`).
- **SLA auto-reject:** pending rows older than 24h since `updated_at` without a decision are auto-rejected with reason `other` and explanatory note.
- All approve/reject actions append **`admin_action_log`** with before/after JSON where applicable.

---

## Part A2: Demotion requests

- Route: **`/admin/approvals/demotions`** (tab within Approvals).
- **Transfer:** admin selects new owner from **Que Masters** first, then any **active member**; if no suitable member, **archive** or delete path is not used — **archive only** (no hard delete). Former owner becomes **`member`**.
- **Archive:** set `clubs.status = archived`; notify **all members** with `club_closed`.
- **Voluntary step-down (`owner_self`):** auto-approved on submission per product spec; still logged.
- **Admin one-click demote:** creates or completes demotion in one action; must log `admin_action_log` (`club_manual_demoted` / `club_manual_archived` as applicable).
- **Reject demotion:** use **`demotion_rejection_reason_enum`** + optional note.
- Escalation from **complaints:** admin uses “Escalate to demotion” → pre-fills `club_demotion_requests` with link to complaint; complaint status → `escalated`.

---

## Part A3: Complaints & audit

- **`complaints`** are listed/reviewed in the moderation area or a dedicated complaints view; triage duplicates (no rate limit).
- Complainants **do not** receive resolution notifications.
- **`admin_action_log`:** read-only **`/admin/audit-log`** in the Admin app — filter by admin, entity, action, date; JSON diff for `before_value` / `after_value` (uncapped size).
- **`admin_notifications`:** dropdown (5 recent) + **`/admin/notifications`**; fetch on open (no Realtime requirement for MVP).

---

## Part B: Platform Moderation

### Flagged Reviews

Players can flag reviews they believe violate the content policy. Flagged reviews land in the Admin moderation queue.

Reference: [`../client_app/07_review_system.md`](../client_app/07_review_system.md)

#### Moderation Queue

| Column | Description |
|--------|-------------|
| Review content | The flagged text |
| Reviewer | Who wrote the review (non-anonymous to Admins) |
| Subject | Who the review is about |
| Match | The match the review is attached to |
| Flag reason | Selected by the flagger (Offensive / False / Harassment / Other) |
| Flagged by | Who flagged it (and their relationship to the review) |
| Flagged at | Timestamp |
| Status | Pending / Dismissed / Removed |

#### Actions

| Action | Effect |
|--------|--------|
| **Dismiss flag** | Review remains visible; flag is closed; flagger is notified |
| **Remove review** | Review is deleted from the match record and all views; reviewer is notified |
| **Remove + warn reviewer** | Review removed; reviewer receives a platform warning |
| **Remove + suspend reviewer** | Review removed; account suspended (see Account Actions below) |

All moderation decisions are logged with the Admin's identity and the stated reason, and should emit **`admin_action_log`** rows for traceability alongside any existing moderation-specific logging.

---

### Account Actions

Admins can take the following actions on any player account:

| Action | Effect | Reversible? |
|--------|--------|-------------|
| **Warn** | Sends an in-app warning message to the player | N/A |
| **Suspend (temporary)** | Player cannot log in for the suspension period | Yes — Admin can lift early |
| **Suspend (permanent)** | Player account is permanently disabled | Yes — Super Admin only |
| **Delete account** | Account and all PII removed; match records anonymized | No |

#### Suspension Behavior

- Suspended players are logged out immediately on all devices
- During suspension, their profile shows as inactive but their historical match records remain
- Club Owners and Que Masters are notified if a suspended player was a member of their club
- A suspended Que Master's role is temporarily paused — Club Owner can reassign sessions manually
- A suspended Club Owner's clubs remain active; the platform assigns a grace period before clubs are affected (configurable; default: 7 days)

---

### Content Policy Reference

Reviews are removed if they contain:
- Personal attacks or harassment
- Discriminatory language
- False factual claims presented as fact (e.g. "this player cheated")
- Promotional or spam content
- PII (phone numbers, addresses, etc.)

The profanity filter catches obvious violations automatically (see [`../client_app/07_review_system.md`](../client_app/07_review_system.md)). The moderation queue handles edge cases that require human judgment.

---

## Moderation Audit Trail

Every moderation action produces an immutable log entry:

| Field | Value |
|-------|-------|
| Timestamp | UTC |
| Admin | Account that performed the action |
| Action type | `review_removed`, `account_suspended`, `flag_dismissed`, etc. |
| Target | Affected entity (review ID, player ID, etc.) |
| Reason | Admin-selected reason code |
| Notes | Optional free-text explanation |

Platform-wide **admin writes** (approvals, kill switches, `platform_config`, complaints, demotions, etc.) are also recorded in **`admin_action_log`** (see [`../../database/12_club_governance.md`](../../database/12_club_governance.md)).
