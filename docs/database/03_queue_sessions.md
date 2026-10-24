# 03 — Que Sessions

## Overview

A **Que Session** is the central operational unit of ROTRA — a bounded, time-limited badminton event, optionally hosted under a club. Sessions contain a player roster, a Match Queue, Session Feed, and real-time state.

> **Canonical business rules:** [`../business_logic/client_app/08_queue_session.md`](../business_logic/client_app/08_queue_session.md)

Two origin types exist:

- **Friendly Que Session** (`origin = 'player_organized'` until DB rename → `'friendly'`) — created by Club Owner or Que Master; always Regular; no EXP or MMR.
- **Club Que Session** (`origin = 'club_queue'` until DB rename → `'club_que'`) — created by Club Owner or Que Master; Session type (MMR or Fun Games) required.

Only `origin = 'club_queue'` AND `schedule_type = 'mmr'` sessions award EXP and MMR changes.

This file covers:

- `queue_sessions` — session metadata and configuration
- `session_registrations` — per-player admission, in-session status, and payment tracking
- `session_que_masters` — assigned Que Masters per session
- `session_shuttles` — shuttle entries and consumed tubes
- `password_authorizations` — per-user Lobby password grants
- `password_attempts` — failed password cooldown tracking
- `session_feed_entries` — Session Feed and edit history
- `session_payment_audit` — payment change audit log
- `match_requests` — player match proposals (see also [`04_matches.md`](./04_matches.md))

---

## Enums

```sql
CREATE TYPE session_origin_enum AS ENUM ('player_organized', 'club_queue');
-- Planned rename: 'friendly', 'club_que' — see 00_ubiquitous_language.md §20

-- Only applicable when origin = 'club_queue'; NULL for Friendly
CREATE TYPE schedule_type_enum AS ENUM ('mmr', 'fun_games');
-- Product term: Session type

CREATE TYPE session_status_enum AS ENUM ('draft', 'open', 'active', 'closed', 'completed', 'cancelled');

CREATE TYPE session_visibility_enum AS ENUM ('club_members', 'open');

CREATE TYPE schedule_context_enum AS ENUM ('regular_club_schedule', 'quick_session');

CREATE TYPE match_format_enum AS ENUM ('best_of_1', 'best_of_3');

CREATE TYPE markup_type_enum AS ENUM ('flat', 'percentage');

CREATE TYPE admission_status_enum AS ENUM (
  'pending_approval',
  'accepted',
  'waitlisted',
  'declined',
  'withdrawn',
  'cancelled_registration',
  'removed',
  'reserved'
  -- Legacy: 'exited' may exist on admission_status in older migrations;
  -- canonical model uses player_status = 'exited' for attendance exit.
);

CREATE TYPE admission_mode_enum AS ENUM ('automatic', 'approval_required');

CREATE TYPE lobby_identity_visibility_enum AS ENUM (
  'hosts_only',
  'accepted_and_waitlisted',
  'all_authorized'
);

CREATE TYPE player_session_status_enum AS ENUM (
  'not_arrived',
  'i_am_in',
  'i_am_prepared',
  'playing',
  'waiting',
  'resting',
  'eating',
  'suspended',
  'exited'
);

CREATE TYPE join_session_method_enum AS ENUM ('app', 'qr', 'invitation_link');

CREATE TYPE payment_status_enum AS ENUM ('unpaid', 'paid', 'partial');

CREATE TYPE match_request_status_enum AS ENUM (
  'pending',
  'approved',
  'modified_and_approved',
  'declined',
  'cancelled_by_player',
  'invalidated',
  'started',
  'completed'
);

CREATE TYPE feed_entry_type_enum AS ENUM ('field_change', 'announcement', 'system_event');

CREATE TYPE temporary_skill_level_enum AS ENUM (
  'beginner_low', 'beginner_mid', 'beginner_high',
  'intermediate_low', 'intermediate_mid', 'intermediate_high',
  'advanced_low', 'advanced_mid', 'advanced_high',
  'professional'
);
```

---

## Table: `queue_sessions`

```sql
CREATE TABLE queue_sessions (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id  uuid REFERENCES clubs(id) ON DELETE CASCADE,
  host_id  uuid NOT NULL REFERENCES profiles(id),

  -- Session classification
  origin           session_origin_enum NOT NULL,
  schedule_type    schedule_type_enum,  -- NULL when Friendly
  schedule_context schedule_context_enum NOT NULL DEFAULT 'quick_session',

  status     session_status_enum NOT NULL DEFAULT 'draft',
  visibility session_visibility_enum NOT NULL DEFAULT 'club_members',

  -- Display
  title       text NOT NULL,
  description text,

  -- Venue & time
  location  text NOT NULL,
  address   text,
  venue_lat      double precision,
  venue_lng      double precision,
  venue_address  text,
  date_time timestamptz NOT NULL,
  end_time  timestamptz,
  duration_minutes int,  -- derived or stored for display

  -- Court configuration
  num_courts        int NOT NULL CHECK (num_courts > 0),
  players_per_court int NOT NULL CHECK (players_per_court > 0),
  total_slots       int NOT NULL,

  -- Match format
  match_format  match_format_enum NOT NULL DEFAULT 'best_of_1',
  score_limit   int NOT NULL DEFAULT 21,
  match_duration_estimate_minutes int,  -- display estimate; formula TBD

  -- Admission
  admission_mode admission_mode_enum NOT NULL DEFAULT 'automatic',
  cancellation_cutoff_hours int NOT NULL DEFAULT 5,

  -- Skill eligibility (temporary model)
  allowed_skill_levels temporary_skill_level_enum[] NOT NULL DEFAULT '{}',

  -- Password protection
  password_hash text,  -- NULL = not password-protected
  password_enabled bool NOT NULL DEFAULT false,

  -- Privacy & visibility settings
  lobby_identity_visibility lobby_identity_visibility_enum NOT NULL DEFAULT 'hosts_only',
  public_live_viewing     bool NOT NULL DEFAULT false,
  waitlisted_live_viewing bool NOT NULL DEFAULT false,
  shuttle_cost_visible    bool NOT NULL DEFAULT false,
  repeated_match_warning  bool,  -- default TBD

  -- Payment instructions
  payment_methods text[] NOT NULL DEFAULT ARRAY['cash'],
  payment_instructions_html text,  -- sanitized rich text

  -- Cost inputs (court; shuttles in session_shuttles)
  court_cost           numeric(10, 2),
  markup_type          markup_type_enum,
  markup_amount        numeric(10, 2),

  -- Legacy single-shuttle columns (migrate to session_shuttles)
  shuttle_type         text,
  shuttle_cost_per_tube numeric(10, 2),
  shuttles_used        int NOT NULL DEFAULT 0,

  -- Smart monitoring
  smart_monitor_threshold numeric(3, 2) NOT NULL DEFAULT 0.90,

  -- Waitlisted restricted message (when waitlisted_live_viewing = false)
  waitlisted_restricted_message text,

  -- Terminal timestamps
  completed_at  timestamptz,
  cancelled_at  timestamptz,
  cancelled_by  uuid REFERENCES profiles(id),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT club_queue_requires_schedule_type
    CHECK (origin = 'player_organized' OR schedule_type IS NOT NULL),

  CONSTRAINT clubless_only_player_organized
    CHECK (club_id IS NOT NULL OR origin = 'player_organized')
);
```

### Notes

- `total_slots` must equal `num_courts × players_per_court` (app-enforced; optional GENERATED column).
- `password_hash` only — never store plaintext passwords.
- `payment_instructions_html` must be sanitized server-side (see `08_queue_session.md` §32).
- `completed_at` set when status → `completed`; `cancelled_at` when → `cancelled`.
- Session type (`schedule_type`) cannot change after `active` or after any match has started (app-enforced).

### Session Status State Machine

```
draft ──► open ──► active ──► closed ──► completed
  │         │         │
  └─────────┴─────────┴──► cancelled
```

| Status | Meaning | Who can transition |
|--------|---------|-------------------|
| `draft` | Setup incomplete | Host publishes → `open` |
| `open` | Accepting registrations | Host starts → `active`; host cancels → `cancelled` |
| `active` | Matches running | Host closes → `closed`; host cancels → `cancelled` |
| `closed` | Queue done; settling payments | Host completes when all paid → `completed` |
| `completed` | Terminal; read-only | — |
| `cancelled` | Terminal; will not proceed | Club Owner or Que Master from `draft`, `open`, or `active` |

> **Discovery visibility:** Only `open` and `active` appear on Session Discovery Dashboard (`/dashboard`).

### Indexes

```sql
CREATE INDEX idx_queue_sessions_club_id    ON queue_sessions(club_id);
CREATE INDEX idx_queue_sessions_host_id    ON queue_sessions(host_id);
CREATE INDEX idx_queue_sessions_status     ON queue_sessions(status);
CREATE INDEX idx_queue_sessions_date_time  ON queue_sessions(date_time);
CREATE INDEX idx_queue_sessions_origin     ON queue_sessions(origin);
CREATE INDEX idx_queue_sessions_schedule   ON queue_sessions(schedule_type);
CREATE INDEX idx_queue_sessions_geo        ON queue_sessions(venue_lat, venue_lng)
  WHERE venue_lat IS NOT NULL AND venue_lng IS NOT NULL;
```

---

## Table: `session_que_masters`

Assigned Que Masters for a specific session (distinct from club-level Que Master role).

```sql
CREATE TABLE session_que_masters (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES queue_sessions(id) ON DELETE CASCADE,
  que_master_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by   uuid NOT NULL REFERENCES profiles(id),
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, que_master_id)
);
```

Only **Club Owner** may INSERT/DELETE. Multiple rows per session allowed.

---

## Table: `session_registrations`

One row per player per session.

```sql
CREATE TABLE session_registrations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES queue_sessions(id) ON DELETE CASCADE,
  player_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  admission_status admission_status_enum NOT NULL,

  waitlist_position int,
  promotion_deadline_at timestamptz,  -- auto-promotion confirmation window (TBD duration)

  join_method join_session_method_enum NOT NULL DEFAULT 'app',

  player_status player_session_status_enum NOT NULL DEFAULT 'not_arrived',

  -- Temporary skill level (QM-assigned for eligibility display)
  assigned_skill_level temporary_skill_level_enum,

  -- Ordering timestamps
  accepted_at         timestamptz,
  waitlist_entered_at timestamptz,
  checked_in_at       timestamptz,  -- I Am In
  prepared_at         timestamptz,
  exited_at           timestamptz,

  -- Payment
  payment_status  payment_status_enum NOT NULL DEFAULT 'unpaid',
  payment_amount  numeric(10, 2) NOT NULL DEFAULT 0,
  payment_method  text,
  payment_recorded_by uuid REFERENCES profiles(id),
  payment_recorded_at timestamptz,
  per_player_cost numeric(10, 2),
  late_cancellation_obligation bool NOT NULL DEFAULT false,

  registered_at timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (session_id, player_id)
);
```

### Admission vs player status

- **`admission_status`** — capacity / registration concern.
- **`player_status`** — real-time in-venue attendance (authoritative for **Exited**).
- Do not use admission `exited` in new code; use `player_status = 'exited'`.

### Waitlist FIFO

`waitlist_position` — lower number = earlier in line. `waitlist_entered_at` breaks ties.

### Capacity reduction (LIFO demotion)

When `total_slots` reduced below accepted count, demote most recently accepted (by `accepted_at` DESC) to waitlist; preserve FIFO for waitlist order after demotion.

### Indexes

```sql
CREATE INDEX idx_session_reg_session_id     ON session_registrations(session_id);
CREATE INDEX idx_session_reg_player_id      ON session_registrations(player_id);
CREATE INDEX idx_session_reg_admission      ON session_registrations(admission_status);
CREATE INDEX idx_session_reg_player_status  ON session_registrations(player_status);
CREATE INDEX idx_session_reg_waitlist ON session_registrations(session_id, waitlist_position)
  WHERE admission_status = 'waitlisted';
CREATE INDEX idx_session_reg_accepted_at ON session_registrations(session_id, accepted_at)
  WHERE admission_status = 'accepted';
```

---

## Table: `session_shuttles`

```sql
CREATE TABLE session_shuttles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES queue_sessions(id) ON DELETE CASCADE,
  brand      text NOT NULL,
  shuttle_type text,
  planned_tubes   int NOT NULL DEFAULT 0 CHECK (planned_tubes >= 0),
  consumed_tubes  int NOT NULL DEFAULT 0 CHECK (consumed_tubes >= 0),
  cost_per_tube   numeric(10, 2),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

---

## Table: `password_authorizations`

```sql
CREATE TABLE password_authorizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES queue_sessions(id) ON DELETE CASCADE,
  player_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  authorized_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, player_id)
);
```

Revoked on: registration cancel, request withdraw, Early Exit.

---

## Table: `password_attempts`

```sql
CREATE TABLE password_attempts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES queue_sessions(id) ON DELETE CASCADE,
  -- NULL player_id for anonymous attempts before auth
  player_id  uuid REFERENCES profiles(id),
  failed_at  timestamptz NOT NULL DEFAULT now(),
  next_allowed_at timestamptz NOT NULL  -- failed_at + 5 minutes after first failure
);
```

Backend enforces cooldown; client cannot bypass.

---

## Table: `session_feed_entries`

```sql
CREATE TABLE session_feed_entries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES queue_sessions(id) ON DELETE CASCADE,
  entry_type feed_entry_type_enum NOT NULL,
  actor_id   uuid REFERENCES profiles(id),
  title      text NOT NULL,
  description text,
  field_name text,
  previous_value text,
  new_value    text,
  is_edited    bool NOT NULL DEFAULT false,
  edit_history jsonb NOT NULL DEFAULT '[]',  -- [{edited_at, editor_id, previous_body, new_body}]
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Hard deletion: **TBD**. Prefer edit history over silent removal.

---

## Table: `session_payment_audit`

```sql
CREATE TABLE session_payment_audit (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES session_registrations(id) ON DELETE CASCADE,
  previous_amount numeric(10, 2),
  new_amount      numeric(10, 2),
  previous_status payment_status_enum,
  new_status      payment_status_enum,
  changed_by      uuid NOT NULL REFERENCES profiles(id),
  changed_at      timestamptz NOT NULL DEFAULT now(),
  note            text
);
```

Append-only. No inserts after session `completed`.

---

## Automatic Queueing Settings

Session-level configuration for the Automatic Queueing matchmaking engine. Canonical business rules: [`../business_logic/client_app/automatic_queueing.md`](../business_logic/client_app/automatic_queueing.md) §22.

Exact column placement is **TBD** — may live on `queue_sessions` as dedicated columns, a JSONB `aq_settings` blob, or a separate `session_aq_settings` table. Product term mapping uses `aq_` prefix below.

### Recommended responsibilities

| Field | Type | Purpose |
| ----- | ---- | ------- |
| `aq_enabled` | bool | Master on/off for Automatic Queueing |
| `aq_mode` | enum | Default matchmaking mode: `fun_relaxed`, `balanced`, `training`, `overload` |
| `aq_operating_level` | enum | `recommend_only`, `assisted`, `full_automatic` |
| `aq_auto_placement` | bool | Auto-add passing candidates to Match Queue |
| `aq_require_approval` | bool | Que Master must approve before queue placement |
| `aq_min_suitability_score` | int | Minimum Match Suitability Score (0–100) |
| `aq_repetition_warning_enabled` | bool | Advisory repetition detection |
| `aq_carry_limit` | int | Max consecutive carry assignments per Player |
| `aq_max_consecutive_games` | int | Back-to-back match limit |
| `aq_min_rest_minutes` | int | Minimum rest between matches |
| `aq_overload_allowed` | bool | Permit Overload Training mode |
| `aq_overload_limit_per_player` | int | Session cap on overload matches per Player |
| `aq_low_confidence_restrictions` | bool | Block overload for low Rating Confidence |
| `aq_explanation_visibility` | enum | Player-facing explanation level |
| `aq_alternative_count` | int | Number of alternative candidates to retain/show |
| `aq_next_match_mode_override` | enum (nullable) | One-match mode override; resets after use |
| `aq_queue_starvation_threshold` | int | Skips before starvation warning / forced inclusion |
| `aq_paused` | bool | Temporary pause without disabling feature |

### Enum: `aq_mode_enum` (proposed)

```sql
CREATE TYPE aq_mode_enum AS ENUM (
  'fun_relaxed',
  'balanced',
  'training',
  'overload'
);
```

### Enum: `aq_operating_level_enum` (proposed)

```sql
CREATE TYPE aq_operating_level_enum AS ENUM (
  'recommend_only',
  'assisted',
  'full_automatic'
);
```

### Candidate state (runtime — not persisted on `queue_sessions`)

Active candidate matches may be stored in a separate `aq_candidates` table or ephemeral cache. See [`04_matches.md`](./04_matches.md) for decision-record fields on approved matches.

---

## Table: `match_requests`

See [`04_matches.md`](./04_matches.md) for full spec. Summary:

```sql
CREATE TABLE match_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES queue_sessions(id) ON DELETE CASCADE,
  requesting_player_id uuid NOT NULL REFERENCES profiles(id),
  status          match_request_status_enum NOT NULL DEFAULT 'pending',
  match_format    match_format_enum NOT NULL,
  lineup_player_ids uuid[] NOT NULL,  -- includes requester; app validates size
  match_id        uuid REFERENCES matches(id),  -- set when queued/started
  reviewed_by     uuid REFERENCES profiles(id),
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

---

## Per-Player Cost Formula

```
total_cost = court_cost + sum(consumed_tubes × cost_per_tube) across session_shuttles
per_player_cost = ceil(total_cost / accepted_player_count) + markup
```

See [`../business_logic/client_app/09_cost_system.md`](../business_logic/client_app/09_cost_system.md).

---

## Realtime Subscriptions

| Table | Subscribed By | Events |
|-------|---------------|--------|
| `queue_sessions` | Hosts, Players, Umpires | UPDATE |
| `session_registrations` | Hosts, Players | INSERT, UPDATE |
| `session_feed_entries` | Lobby-authorized viewers | INSERT, UPDATE |
| `match_requests` | Hosts, requesting player | INSERT, UPDATE |
| `session_shuttles` | Hosts, Players (filtered) | INSERT, UPDATE |

See `09_rls_and_realtime.md`.

---

## Relationships

```
clubs ──► queue_sessions (1:many)
profiles ──► queue_sessions (1:many via host_id)
queue_sessions ──► session_que_masters (1:many)
queue_sessions ──► session_registrations (1:many)
queue_sessions ──► session_shuttles (1:many)
queue_sessions ──► session_feed_entries (1:many)
queue_sessions ──► match_requests (1:many)
queue_sessions ──► matches (1:many)  [see 04_matches.md]
session_registrations ──► session_payment_audit (1:many)
```
