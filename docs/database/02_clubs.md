# 02 — Clubs

## Overview

Clubs are the **primary organizational unit** of ROTRA. All queue sessions, leaderboards, and statistics are scoped under a club. Players can belong to multiple clubs simultaneously. Role elevation (Que Master) is per-club — a player may be a Que Master in Club A and a regular member in Club B.

This file covers:
- `clubs` — the club entity itself
- `club_members` — player-club membership with role tracking
- `club_join_requests` — pending and historical join/invite requests
- `club_blacklist` — silently blocked players per club
- `club_membership_audit_log` — immutable log of all membership state changes

**Club creation, demotions, complaints, and admin audit** live in [`12_club_governance.md`](12_club_governance.md). Clubs are **never hard-deleted** — closure and demotion use `status = 'archived'` (see demotion flows in doc 12).

---

## Enums

```sql
CREATE TYPE club_status_enum AS ENUM ('active', 'paused', 'archived');

-- Role within a specific club
-- 'owner' is assigned when the club is created (owner is also inserted into club_members)
-- clubs.owner_id remains the authoritative ownership column for fast lookup and ownership transfer
CREATE TYPE club_role_enum AS ENUM ('member', 'que_master', 'owner');

CREATE TYPE member_status_enum AS ENUM ('active', 'removed', 'left');

CREATE TYPE join_method_enum AS ENUM ('invite_link', 'direct_invite', 'request');

CREATE TYPE join_request_status_enum AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE membership_action_enum AS ENUM (
  'joined',
  'removed',
  'left',
  'blacklisted',
  'unblacklisted',
  'que_master_assigned',
  'que_master_revoked',
  'join_request_approved',
  'join_request_rejected',
  'invite_link_rotated',
  'ownership_transferred',
  'ownership_revoked'
);
```

`ownership_revoked` is used when ownership ends without a transfer (e.g. club archived after demotion). See [`12_club_governance.md`](12_club_governance.md).

---

## Table: `clubs`

```sql
CREATE TABLE clubs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES profiles(id),

  name        text NOT NULL,
  description text,
  avatar_url  text,

  status      club_status_enum NOT NULL DEFAULT 'active',

  -- Membership settings
  auto_approve        bool NOT NULL DEFAULT false,
  invite_link_enabled bool NOT NULL DEFAULT true,

  -- One active invite token at a time; rotation invalidates the previous token
  invite_token            text UNIQUE,
  invite_token_created_at timestamptz,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

### Notes

- `owner_id` is the authoritative ownership column — used for fast lookups, ownership transfer checks, and as the source of truth if the `club_members` row ever goes out of sync.
- When a club is created, the owner is **also inserted into `club_members`** with `role = 'owner'`. This means `is_club_member()` covers the owner without needing a separate `is_club_owner()` check in most contexts. `is_club_owner()` is retained for ownership-specific actions (e.g. transferring ownership, archiving the club).
- `invite_token` is a random string (e.g. `nanoid`). Rotating it sets a new value and a new `invite_token_created_at`, invalidating all prior links.
- When `status = 'archived'`, the club is read-only. No new sessions, join requests, or membership changes are accepted at the application layer.
- When `status = 'paused'`, the club is visible but no new sessions or join requests are allowed.

### Trigger: auto-insert owner into club_members on club creation

```sql
CREATE OR REPLACE FUNCTION handle_new_club()
RETURNS trigger AS $$
BEGIN
  INSERT INTO club_members (club_id, player_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_club_created
  AFTER INSERT ON clubs
  FOR EACH ROW EXECUTE FUNCTION handle_new_club();
```

### Indexes

```sql
CREATE INDEX idx_clubs_owner_id ON clubs(owner_id);
CREATE INDEX idx_clubs_invite_token ON clubs(invite_token);
CREATE INDEX idx_clubs_status ON clubs(status);
```

---

## Table: `club_members`

Tracks active and historical membership for every player-club relationship.

```sql
CREATE TABLE club_members (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id   uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  role      club_role_enum NOT NULL DEFAULT 'member',
  status    member_status_enum NOT NULL DEFAULT 'active',

  joined_at  timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (club_id, player_id)
);
```

### Notes

- A player can only have **one row** per club (`UNIQUE` constraint). Status changes (e.g. removing, leaving) update the existing row rather than creating a new one.
- `role = 'que_master'` is assigned by the Club Owner. Multiple members can hold this role simultaneously (no cap).
- The Club Owner **is** inserted into `club_members` with `role = 'owner'` when the club is created. This unifies membership queries — `is_club_member()` returns `true` for the owner without needing a separate branch.
- The owner's `club_members` row should never be deleted or have its status changed to `'removed'` or `'left'` — this is enforced at the application layer. Ownership transfer requires updating both `clubs.owner_id` and the relevant `club_members.role` values in a single transaction.
- Removed or left members may re-join (a new row is not created; the existing row's status is updated back to `'active'`) unless they are blacklisted.

### Indexes

```sql
CREATE INDEX idx_club_members_club_id   ON club_members(club_id);
CREATE INDEX idx_club_members_player_id ON club_members(player_id);
CREATE INDEX idx_club_members_status    ON club_members(status);
CREATE INDEX idx_club_members_role      ON club_members(role);
```

---

## Table: `club_join_requests`

Records all join attempts regardless of outcome. Used for audit history and for the pending requests queue visible to the Club Owner.

```sql
CREATE TABLE club_join_requests (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id   uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  method    join_method_enum NOT NULL,
  status    join_request_status_enum NOT NULL DEFAULT 'pending',

  -- Optional rejection note (internal, not shown to player)
  note      text,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

### Notes

- When `auto_approve = true` on the club, new rows are inserted with `status = 'approved'` immediately and the player is inserted into `club_members` in the same transaction.
- For direct invites: a row with `method = 'direct_invite'` is created when the Club Owner sends an invite. The player accepts/declines, updating the status.
- A player who is on the blacklist will have any new insert rejected at the application layer before reaching the DB. No row is created for silently blocked attempts.
- There is no `UNIQUE` constraint on `(club_id, player_id)` — a player may have multiple historical request rows (e.g. left and rejoined).

### Indexes

```sql
CREATE INDEX idx_join_requests_club_id   ON club_join_requests(club_id);
CREATE INDEX idx_join_requests_player_id ON club_join_requests(player_id);
CREATE INDEX idx_join_requests_status    ON club_join_requests(status);
```

---

## Table: `club_blacklist`

Permanently blocks a player from all entry points to a specific club. Silent — the blocked player receives generic errors and is never told they are blacklisted.

```sql
CREATE TABLE club_blacklist (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  club_id     uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  player_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Internal note, never shown to the blocked player
  note        text,

  created_by  uuid NOT NULL REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (club_id, player_id)
);
```

### Notes

- A player **must be removed** from `club_members` before being blacklisted (enforced at the application layer).
- Removing a player from the blacklist deletes the row. This does not re-add them to `club_members`.
- Blacklist is per-club only — no effect on the player's membership in other clubs.
- When checking club entry (invite link, join request, direct invite), the application queries this table first. If a row exists, the action is silently rejected.

### Indexes

```sql
CREATE INDEX idx_club_blacklist_club_id   ON club_blacklist(club_id);
CREATE INDEX idx_club_blacklist_player_id ON club_blacklist(player_id);
```

---

## Table: `club_membership_audit_log`

Append-only log of every significant membership event. Never updated or deleted.

```sql
CREATE TABLE club_membership_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id      uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  player_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action       membership_action_enum NOT NULL,
  performed_by uuid NOT NULL REFERENCES profiles(id),

  -- Free-text reason or note captured at time of action
  note         text,

  created_at   timestamptz NOT NULL DEFAULT now()
);
```

### Notes

- Rows are **never updated or deleted** — this is a strict audit trail.
- `performed_by` records which user triggered the action (could be the player themselves for 'left', or the Club Owner for 'removed', 'que_master_assigned', etc.).
- Useful for the Club Owner's membership action log view and for dispute resolution.

### Indexes

```sql
CREATE INDEX idx_audit_log_club_id   ON club_membership_audit_log(club_id);
CREATE INDEX idx_audit_log_player_id ON club_membership_audit_log(player_id);
CREATE INDEX idx_audit_log_created_at ON club_membership_audit_log(created_at DESC);
```

---

## Club State Machine

```
         invite_link / direct_invite / request
                         │
                         ▼
                  [join request created]
                         │
          ┌──────────────┴──────────────┐
          │ auto_approve = ON           │ auto_approve = OFF
          ▼                             ▼
   approved immediately          pending (Club Owner reviews)
          │                       │           │
          │                   approved     rejected
          └───────────────────────┘
                         │
                         ▼
                   club_members (active)
                         │
              ┌──────────┴──────────┐
              │ removed by owner    │ left voluntarily
              ▼                     ▼
        status = 'removed'    status = 'left'
              │
        [can be blacklisted]
              │
        club_blacklist row inserted
```

---

## Club Owner Statistics (Financial)

The Club Owner statistics view (covered in the product docs) is powered by queries across these tables plus `queue_sessions` and `session_registrations`. No separate materialized table exists for MVP — queries are run on-demand with appropriate indexes.

Key queries:

| Metric | Source |
|---|---|
| New members (time range) | `club_members.joined_at` |
| Consistent members (≥3 sessions/30d) | `session_registrations` joined to `queue_sessions` |
| Members via invite link | `club_join_requests` where `method = 'invite_link'` |
| Spending per session | `queue_sessions` (court + shuttle cost columns) |
| Total collected / outstanding | `session_registrations` (payment columns) |
