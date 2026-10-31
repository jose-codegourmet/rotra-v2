# Sessions, club players, and roster

**Last verified:** 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Status:** Proposed records; field names are new design names, not existing Prisma columns.

## `club_players`

| Field | Type / rule |
|---|---|
| `id` | UUID PK; can originate offline |
| `club_id` | UUID FK to clubs; required |
| `player_id` | Nullable UUID FK to global players; null for guests |
| `display_name`, `nickname` | Required name, optional nickname; club-local display |
| `added_at` | Timestamptz the club first saved this player; drives the Saved players “Added” filter and the derived “New players this week” count (Monday 00:00 Asia/Manila through now, inclusive; decision #301, October 31, 2026) |
| `created_at`, `updated_at`, `revision` | Common metadata |

Unique `(club_id, id)` supports scoped FKs. Partial unique `(club_id, player_id)` when linked prevents duplicate canonical members of the saved list. Name is **not unique**. Index `(club_id, display_name, id)` for saved-list lookup; substring/fuzzy indexing is a later query-driven choice.

A guest can persist here indefinitely without a global profile. After confirmed identity linkage, earlier valid guest games must be included in personal history and ranking under existing eligibility/window rules (owner decision, October 28, 2026). Preserve historical identity snapshots and permanent results; use an auditable, repeat-safe attribution/projection mechanism rather than blindly rewriting old facts. Confirmation evidence and duplicate/mistaken-link resolution remain open.

`club_player_private_inputs`: optional one-to-one private intake for operator-entered normalized phone, email, and preset identity fields, with capture timestamps and resolution state. Do not duplicate already-known hidden contacts. On successful resolution, minimize/purge redundant intake according to a policy still to be decided. Pending contact fields never appear in public roster payloads.

Duplicate offline entries can conflict on linking. Quarantine the link operation and retain both source IDs until reviewed; do not merge by name or rewrite confirmed match participants automatically.

## `queue_sessions`

| Field | Type / rule |
|---|---|
| `id`, `club_id` | UUID PK; required owning club FK |
| `title`, `notes` | Text |
| `scheduled_start_at`, `scheduled_end_at` | Timestamptz; end after start |
| `venue_id` | Nullable FK to `club_venues` (scoped by club); null for sessions made before the list existed |
| `venue_name`, `venue_address` | Session venue snapshot taken from the venue when chosen, separate from founding address; later venue edits don't rewrite past sessions |
| `state` | Proposed `prepared`, `active`, `finalizing`, `completed`, `invalid` (the prototype shows completed as "finalized") |
| `invalid_reason` | Nullable text shown on the session record; required when `state = invalid` |
| `session_mode` | Chill/Fair/Hard |
| `allow_singles`, `allow_doubles` | Booleans; both may be false (manual fun games only) |
| `minimum_games` | Nonnegative integer; target, not closure constraint |
| `minimum_is_calculated` | Boolean, default true. While true and the session is prepared, the server recomputes `minimum_games` from courts, scheduled length, roster count (or `expected_players`), and formats. Frozen at start |
| `players_per_court` | Positive integer (default from `clubs.default_players_per_court`, 8); slots = this × non-removed courts |
| `expected_players` | Nullable positive integer used before the roster has players |
| `queue_revision` | Bigint for coherent reorder/regenerate commands |
| `started_at`, `finalized_at` | Nullable until corresponding transition |
| `series_id` | Nullable UUID shared by sessions created together as a repeating series; each session stays independent |
| `start_license_term_id` | Nullable FK before start; retained start authorization evidence |
| `revision`, timestamps | Common metadata |
| `public_slug` | Unique short slug for the session link (public page URL) |
| `accept_join_requests` | Boolean, default true; when false the public page offers no Request to join |

Proposed unique `(club_id, id)` and partial unique `(club_id)` for state in active/finalizing. This protects server-known active state but cannot alone prevent two disconnected sessions from starting.

**Additional proposal:** `club_session_reservations` has `club_id` as PK, unique `session_id`, and a scoped FK to the session. Acquire it online before issuing permission to start that session offline. Different devices may operate the same reserved session for recovery. Downloading a read-only/preparation copy need not acquire a reservation; the exact activation UX is open. No second distinct session receives offline-start permission while the reservation exists.

**No overlapping sessions.** A club's non-invalid sessions must not overlap in time. Enforce it with an exclusion constraint, e.g. `EXCLUDE USING gist (club_id WITH =, tstzrange(scheduled_start_at, scheduled_end_at) WITH &&) WHERE (state <> 'invalid')` (needs `btree_gist`), plus a command-level check that reports which session clashes and whether it is the same venue (venue clash) or another venue (time clash). Creating a series inserts only the free dates, in one transaction. Extending a running session's end time must pass the same check.

Session timestamps from a device are evidence, not automatic proof of an unexpired license. Offline start/expiry rules need a trusted authorization design.

## `session_waitlist`

| Field | Type / rule |
|---|---|
| `id`, `club_id`, `session_id`, `club_player_id` | UUID keys with scoped FKs |
| `skill_level_id` | Level chosen when added; becomes the roster level when given a slot |
| `added_at` | Historical arrival/entry time; insufficient by itself to encode all waitlist priority |

Unique `(session_id, club_player_id)`, and a player can't be both waitlisted and on the roster for the same session (command check). **Give slot** deletes the waitlist row and inserts the `session_players` row in one transaction, recording when it went over budget. Slot counts are derived, never stored.

**Budget changes in preparation** (first come, first served): when capacity shrinks, move the latest-confirmed roster entries beyond the budget to the **front of the existing waitlist**, preserving their relative joining order, in one transaction. Growing the budget fills from that resulting order. Active sessions are never rebalanced: removing a court there unseats nobody.

Copying `confirmed_at` into `added_at` does not guarantee this rule: an earlier guest request can already be waiting. Preserve historical timestamps and define ordering separately. Equal-time ties, repeated demotion/promotion and concurrent saves need the reviewed durable ordering contract in [#245](https://github.com/jose-codegourmet/rotra-v2/issues/245); no new position field or timestamp-rewriting scheme is approved here.

## `session_join_requests`

Guest requests sent from the session link (decided October 26, 2026).

| Field | Type / rule |
|---|---|
| `id`, `club_id`, `session_id` | UUID keys with scoped FKs |
| `name` | Required text; `nickname` optional |
| `phone_e164` | Optional normalized mobile number; visible to the club only, never on the public page |
| `stated_band` | `beginner`, `intermediate`, `advanced`, `unsure` (self-declared, not a level) |
| `status` | `pending`, `confirmed`, `declined` |
| `requested_at` | Server request time; orders the review list and supplies initial waitlist arrival evidence, subject to the displacement priority above |
| `decided_at`, `decided_by_device` | Set on confirm/decline |
| `club_player_id` | Set on confirm: the club player created for the guest |

A request never inserts `session_players` or `session_waitlist` by itself. **Confirm** creates the club player (guest, or lookup pending with a phone), then a `session_players` row with the chosen level, or a `session_waitlist` row with `added_at = requested_at` when slots are full, in one transaction. Creating requests is an unauthenticated public write: rate-limit per IP/device and session, cap pending requests per session, and reject when `accept_join_requests` is false or the session is finalized/invalid. Confirm/decline are ordinary club sync operations (work offline on a downloaded session).

## `club_venues`

| Field | Type / rule |
|---|---|
| `id`, `club_id` | UUID PK; club FK |
| `name` | Required; unique per club, case-insensitive (`UNIQUE (club_id, lower(name))`) |
| `address` | Optional text |
| `court_fee_per_court_hour_minor` | Nullable integer ≥ 0; prefills the session cost estimate |
| `entrance_fee_minor` | Nullable integer ≥ 0; when set, prefills the session's misc entrance fee per head (before the club default) |
| `currency` | ISO 4217; `PHP` in v1 |
| `revision`, timestamps | Common metadata |

Choosing a venue copies its rate into `session_cost_estimates.court_fee_per_court_hour_minor`; editing the session's fee never updates the venue. Venue deletion is not specified; keep rows referenced by sessions.

## `session_players`

| Field | Type / rule |
|---|---|
| `id`, `club_id`, `session_id`, `club_player_id` | UUID keys with scoped FKs |
| `player_id_at_entry` | Optional global profile FK; no forced profile for guests |
| `name_snapshot` | Display at entry |
| `present` | Operator-controlled boolean; false when added in preparation, true when added to an active session |
| `present_changed_at` | Timestamp of the last presence change (reset to the start time at session start); feeds the derived wait time |
| `assessment_id` | FK to the roster assessment revision selected for this entry |
| `skill_level_id` | FK to one of the nine levels; required on confirmation/start/late entry. Permitted missing-level preparation states and physical nullability remain unresolved in #245 |
| `level_locked_at` | Null before start; set at start or on late entry |
| `confirmed_at`, `joined_at`, `revision` | Timestamps/revision |

Unique `(session_id, club_player_id)` and partial unique `(session_id, player_id_at_entry)` for known profiles. Composite unique `(club_id, session_id, id)` supports match participation FKs.

The roster/assessment relationship is cyclic: create the roster and assessment in one transaction using a deferred FK or an initially nullable selected-assessment pointer, then validate it before accepting the roster entry. The selected assessment must reference this exact club/player/session entry, not merely any existing assessment UUID.

Lock existing entries' levels on start and late entrants on insertion into the active session. Prevent level/assessment-reference changes after lock. Presence remains editable. `session_players` carries no resting, waitlist, payment, or player self-admission state; the waitlist, paid marks and guest join requests live in their own tables (`session_waitlist`, `session_payment_marks`, `session_join_requests`).

Start is refused while any entry lacks `skill_level_id`. This defensive check does **not** decide column nullability: business rules require a level to confirm a slot, while screen states include missing-level prepared rows. Specify which states may persist before choosing the constraint ([#245](https://github.com/jose-codegourmet/rotra-v2/issues/245)).

Roster removal is allowed only while the session is `prepared`; this does not authorize physically deleting a row referenced by paid marks or already-synced assessments. The removal/demotion identity and retention policy, and whether those assessments still count, remain open in #245. The Give slot delete/insert description above is a proposal subject to that gate. Active sessions cannot remove entries; presence is turned off instead.

Wait time (minutes since the player's last completed/invalid match ended, or since `present_changed_at`) is derived at read time, never stored.

The roster's global link is a historical snapshot. Resolve later identity corrections through explicit linkage history/policy, not hidden retargeting of match facts.

## `session_courts`

| Field | Type / rule |
|---|---|
| `id`, `club_id`, `session_id` | UUID keys |
| `label` | Text; defaults to "Court N" |
| `open_until` | Nullable timestamptz. Null means "until the session ends" and follows `scheduled_end_at` when time is extended. A set time must be later than the moment it is added and not after the session end |
| `removed_at` | Nullable; set when a free court is removed |
| `revision`, timestamps | Common metadata |

Unique `(club_id, session_id, id)`. Unique `(session_id, label)` among non-removed courts (partial index on `removed_at IS NULL`).

Add courts during the session without changing club founding location. Remove only a court with no active hold, and keep at least one non-removed court; soft-remove because historical `match_court_usage` may reference it. `open_until` is a reminder: no command or constraint ends a match when it passes. "Booking ended" is derived.

Extending time updates `scheduled_end_at` (30 or 60 minutes per command in the prototype); keep the change as an ordinary revisioned update or sync operation.

## Counters and access paths

Game/minimum counters derive from full participation and permanent decisions; optionally project them into `club_session_player_summaries`. Do not independently increment a mutable counter on every upload retry.

Indexes: sessions `(club_id, scheduled_start_at DESC, id)`; roster `(session_id, present, id)`; club player link/name indexes above. Existing composite indexes may cover FK lookup; avoid redundant single-column indexes.

Business sources: [players](../../../../business_logic/product/queue/modules/players/README.md), [sessions](../../../../business_logic/product/queue/modules/sessions/README.md).
