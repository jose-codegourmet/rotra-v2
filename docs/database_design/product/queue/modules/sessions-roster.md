# Sessions, club players, and roster

**Last verified:** 2026-11-07 for the MVP offline-start note (D-2026-11-07-03); 2026-11-06 for the court-fill mode, cancelled sessions, the `closed` join-request status and the court planned start (column names settled by Jose; drafted in migration `20261106000100`); 2026-11-01 for court-window boundaries; 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Status:** Proposed records; field names are new design names, not existing Prisma columns.

## `club_players`

| Field | Type / rule |
|---|---|
| `id` | UUID PK; can originate offline |
| `club_id` | UUID FK to clubs; required |
| `player_id` | Nullable UUID FK to global players; null for guests |
| `display_name`, `nickname` | Required name, optional nickname; club-local display. For a linked row (`player_id` set) Saved players reads the global `players.full_name` / `players.nickname` instead, so a player's own name change shows (#705); this copy is what the club entered and stays the name for guests |
| `added_at` | Timestamptz the club first saved this player; drives the Saved players “Added” filter and the derived “New players this week” count (Monday 00:00 Asia/Manila through now, inclusive; decision #301, October 31, 2026) |
| `joined_via` | `club_link`, `session_link` or `added_by_club` ([D-2026-11-09-06](../../../../mvp/decisions.md#d-2026-11-09-06)): set when a registration through the club invite link or a session link adds the player, or when the club adds them (Add player, a confirmed guest request, a Player Information add). Shown as “Joined via club link” / “Joined via session link” / “Added by the club” |
| `linked_to_club_player_id` | Nullable self-FK, set with `removed_at` when the QM links a guest record to a saved player (**Link** on a matching join request, or **Link to saved player…**); the guest's `session_players`, `match_participations` and payments are re-pointed in the same auditable operation and the row is hidden. Only the QM's tap links; a phone match only suggests ([D-2026-11-09-06](../../../../mvp/decisions.md#d-2026-11-09-06)) |
| `removed_at` | Nullable timestamptz: the club deleted this saved player (November 8, 2026). Soft delete, because history (`session_players`, facts, summaries, assessments) keeps pointing at the row. Removed rows are left out of Saved players, its counts, search and Add player; adding the same linked profile again clears it |
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
| `state` | `prepared`, `active`, `finalizing`, `completed`, `invalid`, and (November 6, 2026) `cancelled` (the prototype shows completed as "finalized") |
| `invalid_reason` | Nullable text shown on the session record; required when `state = invalid` |
| `cancelled_at`, `cancel_reason` | **Settled (November 6, 2026):** state `cancelled`, reachable **only from `prepared`** (before start) and final. Cancel session needs internet (never queued offline, no sync replay). `cancelled_at` timestamptz, set ⇔ `state = cancelled`; `cancel_reason` nullable text up to 120 characters, only when cancelled. Roster, waitlist and payment-mark rows are kept unchanged; no refund records ([log](../../../../mockup-changes/2026-11-06-queue-example-sessions-and-cancel.md)) |
| `session_mode` | Chill/Fair/Hard |
| `allow_singles`, `allow_doubles` | Booleans; both may be false (manual fun games only) |
| `request_formats` | Which formats a signed-in Player may ask for with **Request a match** (owner request, November 9, 2026): booleans per format (`doubles`, `singles`, `1v2`, `3v3`, `4v4`, `5v5`), e.g. a JSONB object or six boolean columns. Defaults (decided by the owner, November 10, 2026, option A): `doubles` = `allow_doubles`, `singles` = `allow_singles`, fun formats false; a session saved without a selection behaves the same. Not in Prisma yet, so real mode does not persist `requestFormats` |
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
| `court_fill_mode` | **Settled (November 6, 2026):** enum `manual` (default) · `auto`. The Manual Queue \| Auto Queue switch; changeable any time while active. Changing it needs internet; while a device is offline, auto filling pauses (no automatic placements). `auto` lets commands place the next eligible match On court; it never starts a match. Changing it never moves On court matches ([log](../../../../mockup-changes/2026-11-06-queue-on-court-and-sub-credit.md)) |

Proposed unique `(club_id, id)` and partial unique `(club_id)` for state in active/finalizing. This protects server-known active state but cannot alone prevent two disconnected sessions from starting.

**Additional proposal:** `club_session_reservations` has `club_id` as PK, unique `session_id`, and a scoped FK to the session. Acquire it online before issuing permission to start that session offline. Different devices may operate the same reserved session for recovery. Downloading a read-only/preparation copy need not acquire a reservation; the exact activation UX is open. No second distinct session receives offline-start permission while the reservation exists.

> MVP: offline start is out of MVP under [D-2026-11-07-03](../../../../mvp/decisions.md#d-2026-11-07-03), so this reservation is moot for MVP.

**No overlapping sessions.** A club's non-invalid, non-cancelled sessions must not overlap in time. Enforce it with an exclusion constraint, `EXCLUDE USING gist (club_id WITH =, tstzrange(scheduled_start_at, scheduled_end_at) WITH &&) WHERE (state IN ('prepared', 'active', 'finalizing', 'completed'))` (needs `btree_gist`; drafted in `20261106000100`, listing the counted states because a new enum value can't be used in the migration that adds it), plus a command-level check that reports which session clashes and whether it is the same venue (venue clash) or another venue (time clash). Creating a series inserts only the free dates, in one transaction. Extending a running session's end time must pass the same check.

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
| `status` | `pending`, `confirmed`, `declined`, `closed` (November 6, 2026: a pending request closed by Cancel session; distinct from `declined`), `cancelled` (November 10, 2026, #687: a signed-in Player's own **Cancel request**) |
| `requested_at` | Server request time; orders the review list and supplies initial waitlist arrival evidence, subject to the displacement priority above |
| `decided_at`, `decided_by_device` | Set on confirm/decline; a closed request gets the cancel time |
| `club_player_id` | Set on confirm: the club player created for the guest, or the existing club player of a signed-in Player |
| `player_id` | Nullable FK to the canonical Player when a signed-in Player sent the request ([D-2026-11-09-02](../../../../mvp/decisions.md#d-2026-11-09-02)); `name`/`nickname` are then copied from the profile. Partial unique `(session_id, player_id) WHERE status = 'pending'` enforces one open request per account. **Drafted** in migration `20261110000100` (#687, owner sign-off November 10, 2026); confirm then uses the Player's saved player in the club (created or restored from the profile) |
| `invite_code_id` | Nullable FK to `session_invite_codes` when the link carried `?invite=` ([D-2026-11-09-08](../../../../mvp/decisions.md#d-2026-11-09-08)); feeds “Invited by NAME” |
| `placement` | Enum `join_request_placement`: `slot` (Join a slot, the default and the meaning of every earlier row), `waitlist` (Be waitlisted), `from_waitlist` (a waitlisted Player asks for a slot; `club_player_id` is then set at creation to their waitlisted club player). The player's choice ([D-2026-11-11-02](../../../../mvp/decisions.md#d-2026-11-11-02), #706). Before start the server refuses `slot` while the live roster is at the slot budget, and `from_waitlist` unless a slot is open and the Player is on the waitlist; during play (QM admission above the budget, #284–#287) neither is refused for capacity. Added by migration `20261111000200` (applied 2026-11-11) |
| `suggested_club_player_id`, `linked_club_player_id`, `link_declined_at` | Guest linking ([D-2026-11-09-06](../../../../mvp/decisions.md#d-2026-11-09-06)): the server's phone match among the club's unregistered saved players (never shown publicly), the record the QM chose with **Link**, and the time of **Not them**. Confirm then uses the linked record instead of creating a guest |

A request never inserts `session_players` or `session_waitlist` by itself. **Confirm** creates the club player (guest, or lookup pending with a phone), then a `session_players` row with the chosen level, or a `session_waitlist` row with `added_at = requested_at` when slots are full or the request's `placement` is `waitlist`, in one transaction. A `from_waitlist` request's confirm promotes the existing `session_waitlist` row like **Give slot**; before start it is refused (`conflict`) when the live roster is at the budget again, so it never overfills; during play it may set `over_budget_at` like **Admit player**. Creating requests is an unauthenticated public write: rate-limit per IP/device and session, cap pending requests per session, and reject when `accept_join_requests` is false or the session is finalized/invalid/cancelled. **Settled (November 6, 2026):** cancelling a session closes its pending requests in the same transaction (status `closed` with a decision time, alongside `pending` · `confirmed` · `declined`). Confirm/decline are ordinary club sync operations (work offline on a downloaded session).

## `session_drop_out_notices`

**I can't make it** from a confirmed signed-in Player before start ([D-2026-11-09-03](../../../../mvp/decisions.md#d-2026-11-09-03)). `id`, `club_id`, `session_id`, `session_player_id` (scoped FKs), `player_id` (the authenticated Player; must be linked to the unreleased roster slot), `status` (`open`, `closed`), `decision` (`kept`, `removed`, null while open or when closed by the session ending), `created_at`, `closed_at`, `closed_by_device`. Partial unique `(session_player_id) WHERE status = 'open'`. The slot stays until the operator removes the player (**Remove from roster** closes the notice as `removed` and releases the `session_players` row in one operation; **Keep** closes it as `kept`); finishing or cancelling the session closes open notices.

## `session_invite_codes`

Session invite ([D-2026-11-09-08](../../../../mvp/decisions.md#d-2026-11-09-08)): `id`, `club_id`, `session_id`, `player_id` (confirmed or waitlisted Player), `code` (short random text, unique, never the RTR ID), `created_at`. Unique `(session_id, player_id)`: one code per player and session, created the first time they open the card. Read by the public join flow to resolve `?invite=` into `session_join_requests.invite_code_id`.

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
| `self_checked_in_at` | Nullable timestamp of the player's own **I'm here** ([D-2026-11-09-03](../../../../mvp/decisions.md#d-2026-11-09-03)); set when the linked Player checks in, cleared when the operator changes presence after it. Drives the “checked in themselves” mark; the operator's last action wins |
| `left_at` | Nullable timestamp of the player's own **I'm leaving**; cleared by the next check-in or when the operator sets Present. The QM roster shows “Checked in themselves · TIME” and “Left · TIME” from these two fields |
| `assessment_id` | FK to the roster assessment revision selected for this entry |
| `skill_level_id` | FK to one of the nine levels; required on confirmation/start/late entry. Permitted missing-level preparation states and physical nullability remain unresolved in #245 |
| `level_locked_at` | Null before start; set at start or on late entry |
| `games_adjustment` | Integer, default 0, may be negative (#717, owner decisions November 11, 2026). The Queue Master's **Set games played** override, stored as requested − games counted from completed matches at override time, so displayed games played = counted + adjustment (floored at 0) and keeps counting up. Session-running aid only: facts, results and rank never read it. **Drafted** in migration `20261111000300_roster_games_adjustment`, pending |
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
| `open_until` | Nullable timestamptz. Null means "until the session ends" and follows `scheduled_end_at` whenever the end changes. A set time must be later than the moment it is added and not after the session end |
| `removed_at` | Nullable; set when a free court is removed |
| `starts_at` | Nullable timestamptz (settled November 6, 2026): the court's planned start; null = the session start. A set `open_until` is after it |
| `opened_early_at` | Nullable timestamptz (settled November 6, 2026; needs a `starts_at`); set by **Start anyway** when the court is opened before its planned start, cleared by **Undo early open** while the court is free. The planned start is never rewritten. Counts as use, so the planned start is fixed while it is set |
| `revision`, timestamps | Common metadata |

Unique `(club_id, session_id, id)`. Unique `(session_id, label)` among non-removed courts (partial index on `removed_at IS NULL`).

Add courts during the session without changing club founding location. Remove only a court with no active hold, and keep at least one non-removed court; soft-remove because historical `match_court_usage` may reference it. `open_until` is a reminder: no command or constraint ends a match when it passes. "Booking ended" is derived.

Setting the end time updates `scheduled_end_at` (owner decision, November 6, 2026): after start it may move to any instant after now, later or earlier, up to 24 hours after `started_at`; **Extend 30 min / 60 min** are shortcuts for the same update. Reject a new end before a non-removed court's set `open_until` or at/before a court's planned start. Courts with null `open_until` follow it; set ones do not. Keep the change as an ordinary revisioned update or sync operation. A late or other-day Start session may carry a new `scheduled_end_at` in the same transition. `started_at` is fixed once set: it records when play began and no live command edits it.

**Times carry their day (November 6, 2026).** `scheduled_start_at`, `scheduled_end_at`, `open_until` and a court's planned start are full instants (`timestamptz`), never clock-only values with an inferred "next day". The court's planned start is `starts_at` (mock `startsAt`), a nullable timestamptz (null = session start), drafted in `20261106000100`. Display and entry use the club's time zone (Asia/Manila for v1); storage stays instants per the [conventions](../../conventions.md).

## Counters and access paths

Game/minimum counters derive from full participation and permanent decisions; optionally project them into `club_session_player_summaries`. Do not independently increment a mutable counter on every upload retry.

Indexes: sessions `(club_id, scheduled_start_at DESC, id)`; roster `(session_id, present, id)`; club player link/name indexes above. Existing composite indexes may cover FK lookup; avoid redundant single-column indexes.

Drafted in Prisma by F07.13 with the roster-identity and waitlist-order proposals recorded in [physical schema](../../physical-schema.md#group-d--venues-club-players-queue-sessions-roster-assessments-f0713--20261031000500); both still need #245 approval.

Business sources: [players](../../../../business_logic/product/queue/modules/players/README.md), [sessions](../../../../business_logic/product/queue/modules/sessions/README.md).

## Queue flexibility handoff (October 31, 2026)

The approved product contract uses the prepared slot budget with an explicit override and permits direct active-session admission above it. Court windows have individual planned starts and advisory ends, with starts fixed after use and session-end-following ends distinguished from fixed ends. Reconcile the proposed storage and command validation with these rules in the database epic; this note does not authorize schema or migration changes.

### Court-window actual-start boundary (#320, owner decision November 1, 2026)

For live sessions, new court-window commands validate against `queue_sessions.started_at` rather
than `scheduled_start_at`. At Start session, default court starts follow the actual start;
deliberately staggered starts keep their times. Preserve the scheduled session timestamp and
existing earlier starts on edit; used starts remain fixed. This clarifies command behavior using
existing proposed fields and adds no table, column, or migration.
