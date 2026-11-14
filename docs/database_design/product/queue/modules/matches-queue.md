# Shared queue, matches, and substitutions

**Status:** Proposed data model implementing confirmed business outcomes. Updated October 26, 2026 for the [ROTRA Queue prototype](../../../../../apps/mockup/queue-app/rotra-queue.html). Updated November 6, 2026 for the On court step and substitution game credit ([log](../../../../mockup-changes/2026-11-06-queue-on-court-and-sub-credit.md)): column names settled by Jose the same day and drafted, unapplied, in migration `20261106000100`; the commands that use them are later tickets.

## `matches`

| Field | Type / rule |
|---|---|
| `id`, `club_id`, `session_id` | UUID keys with scoped FKs |
| `match_no` | Positive integer assigned in creation order per session ("Match 7"); unique `(session_id, match_no)`; never reused or renumbered. Offline devices need a collision-free allocation (for example a device-scoped block) or a server-assigned number on sync — open |
| `state` | Waiting/**on_court**/active/completed/invalid. `on_court` (settled November 6, 2026) = placed on a court, not started; `active` = Playing. Removed waiting drafts are excluded from dispatch without becoming played games |
| `format` | Singles, doubles, fun_1v2, fun_3v3, fun_4v4, fun_5v5 |
| `queue_position` | Nullable bigint order key; meaningful while waiting |
| `removed_at` | Nullable timestamp for discarded waiting drafts; never a played-game outcome |
| `origin` | `manual` (Add match, Make match), `suggested` (accepted suggestion), `auto` (Generate matches, formerly called Auto Queue; Regenerate). Not the same as the session's `court_fill_mode` |
| `manual_protected` | True for manually created matches and for any waiting match the operator edited, including a lineup edit while `on_court` (it stays protected if sent back). False for accepted unedited suggestions and auto output |
| `generation_id` | Optional UUID grouping a generation/rebuild command, not a new product feature |
| `attention_reasons` | Derived projection/cache of validated lineup problems |
| `placed_at` | Nullable timestamptz (settled November 6, 2026). Set when the match goes `on_court` (by hand or by Auto Queue); cleared if it is sent back to the queue. Required while `on_court`, null while waiting; matches started before the On court step have none |
| `started_at`, `ended_at`, `revision` | Transition metadata. `started_at` is set **only at Start match**, never at placement; the minutes-played timer reads it |

Do not add a mandatory court FK to a waiting match. An `on_court` match **has** its court assignment (two for 5v5) before it starts; see occupancy below. Index `(session_id, state, queue_position, id)` for non-removed rows to scan the shared queue. Reorder/regenerate under a locked session queue revision; use a deterministic tie key during draft ordering and establish unique canonical waiting positions at commit.

A participant already playing makes a waiting match temporarily ineligible, not automatically broken. Availability/removal problems can mark Needs attention. Healthy manual matches survive regeneration; `on_court` and active matches always survive (Regenerate counts them as untouched). Removing unused automatic drafts must retain enough operation identity to make replay idempotent.

Queue position is advisory: any ready waiting match may be placed regardless of position, so the place command validates eligibility, not "is first in queue". **Send back to queue** gives the match the first `queue_position` (top of the queue). Regenerate gives each rebuilt match the `queue_position` of a match it replaces, so rebuilt work stays where the old work was.

Standard formats that are off for the session (`allow_singles`/`allow_doubles` false) are rejected for new or edited matches by command validation. Fun formats are always accepted for manual matches and never produced by generation.

At Session done, waiting matches and `on_court` matches that never started are excluded from results (on_court ones settled November 6, 2026). Whether they are kept (state waiting, frozen) or marked removed is part of the open closure policy; either way they produce no facts.

## `match_participations`

Fields: UUID `id`; `club_id`, `session_id`, `match_id`, `session_player_id`; `team` A/B; positive `segment_no`; `joined_operation_id`, nullable `left_operation_id`; corresponding local sequence/time evidence; `started_with_match`; `finished_with_match`; `credit_to` (below).

Use scoped FKs to the match and roster entry, and unique `(match_id, session_player_id, segment_no)`. Keep successive segments for a player who leaves and returns. Store/reconstruct the lineup before start without falsely claiming they played.

Full participation is derived only when the player was present for the entire completed match with no gap. A pre-start substitution (a lineup change while waiting or `on_court`) does not count as a participation gap and creates no substitution record. A Replace player on an `active` match (fixing a mistake, November 14, 2026, #840) is stored without a closed segment: segments of a started match are never deleted, so the outgoing player's open row is rewritten to the replacement (their next `segment_no`) and keeps `joined_at`, `started_with_match`, `team`, `credit_to` and `joined_operation_id`, so substitution chains still link. Both sides of an in-game substitution lack full-game credit even if the outgoing player later re-enters, unless the substitution's credit choice names one of them for session counting (below).

Team membership and locked level come from the session entry/recorded lineup, not today's profile rank. Preserve this evidence for opponent/partner calculations. Do not trust a client-provided `performance_eligible` boolean.

Team-size validation is transactional at start: singles 1/1, doubles 2/2, 1v2 1/2, 3v3 3/3, 4v4 4/4, 5v5 5/5. Fun 5v5 requires exactly two courts; every other format requires exactly one.

Partial participants (both sides of an in-game substitution) are excluded from session W/L, games, and award inputs, as well as from minimum credit and global performance.

**Substitution game credit (settled November 6, 2026).** Each in-game substitution records `credit_to`: `none` (default) · `incoming` · `outgoing` (enum `substitution_credit`), set at substitution confirmation. It is a column on the **incoming** player's `match_participations` row, the segment the substitution opened (owner decision, November 6, 2026): `incoming` gives the game to that player, `outgoing` to the player whose segment the same operation closed. Every other segment keeps `none`, and a segment that started with the match never carries credit (check). At most one person per team slot gets the game: a later substitution in the same slot that names a person replaces the earlier choice. The value is frozen when the match is completed or invalid. Session-scoped derivations (live standings, session standings, awards, minimum progress, game counts) treat the credited player as a full participant of that completed match. Long-term performance and rank derivations **ignore** `credit_to` and keep excluding both partial players. An invalid match produces nothing for anyone.

## Court and player occupancy

`match_court_usage`: historical `(club_id, session_id, match_id, court_id)` assignment with acquire/release operation references; supports two courts for 5v5.

`active_court_holds`: one row per occupied court; PK `court_id`, scoped session/match FKs.

`active_player_holds`: one row per active roster player; unique `session_player_id`, scoped match FK, and nullable canonical `player_id` with a partial unique index when known. The global-player hold catches known overlapping active use across sessions; unknown duplicate guests cannot be identified automatically.

Acquire all required holds in a single transaction when **placing** a match on court (holds start at `on_court`, so its players are busy and its court is occupied; the hold triggers accept an `on_court` or active match), in stable key order. Start match then only rechecks presence and holds and sets `started_at`. **Send back to queue** releases the holds; **Move to another court** swaps the court hold atomically. **Swap with the queue** releases the outgoing match's holds and acquires the incoming match's holds on the same court(s) in one transaction, and gives the outgoing match the incoming match's queue position. A court with an `on_court` or active match cannot be removed or edited. Substitution releases the outgoing hold and acquires the incoming hold atomically. Completion/invalidation releases all match holds in the same transaction as the terminal decision.

Offline devices enforce the same checks locally. Concurrent disconnected starts cannot be globally prevented with server constraints alone; conflicting uploads stay pending reconciliation. Replayed historical completed games must be validated as history, not naively treated as current active holds. Clock-only interval ordering is insufficient across devices.

## `match_decisions`

| Field | Type / rule |
|---|---|
| `match_id` | PK/FK; at most one accepted terminal decision |
| `club_id`, `session_id` | Scope |
| `kind` | Completed or invalid |
| `winning_team` | Required A/B for completed; null for invalid |
| `team_a_score`, `team_b_score` | Both null or both nonnegative integers for completed; null for invalid |
| `source_operation_id` | Unique FK to accepted confirmation operation |
| `confirmed_at`, `accepted_at`, actor/device | Source and server evidence |

If scores exist, they must identify the selected winner; no tied-score completion or invented target of 21. Winner-only completion is valid.

Use explicit null-safe checks for each decision kind. Ordinary app roles cannot UPDATE/DELETE a terminal decision or its frozen participant/score evidence. The same applies to Admin's application privileges. A database superuser is not physically incapable of modification; the application must not expose a correction route.

Conflicting confirmations from different devices are retained in sync staging, not inserted by overwriting this row. Choosing an authoritative conflicting confirmation remains a blocking design decision.

Drafted in Prisma by F07.14; keys, triggers and the end-of-match order are in [physical schema](../../physical-schema.md#group-f--matches-participation-occupancy-decisions-f0714--20261031000700).

Business source: [matches](../../../../business_logic/product/queue/modules/matches/README.md), [queue rules](../../../../business_logic/product/queue/modules/queueing/README.md).

## `match_requests`

**Built (November 12, 2026, migration `20261112000400_session_match_requests`)** as
`session_match_requests` (`id` = the client's request id, `club_id`, `session_id`,
`session_player_id` the requester, `format`, `status` `match_request_status`, `requested_at`,
`decided_at`, `match_id`, `created_at`, `updated_at`, `revision`) and
`session_match_request_spots` (`request_id`, `club_id`, `session_id`, `side` `partner` |
`opponent`, `slot_no` 0-based, `session_player_id` nullable = Anyone; PK `(request_id, side,
slot_no)`), the join table instead of arrays. All references are scoped `(club_id, session_id, …)`
FKs. CHECKs: `decided_at` set ⇔ status ≠ `open`; `match_id` set ⇔ status = `added`; `slot_no >= 0`.
Partial uniques: one open request per `(session_id, session_player_id)`; a player named once per
request. Differences from the proposal below: no `player_id` (the requester's roster entry carries
the account link) and no `decided_by_device` (decisions are online commands for now, not sync
operations). The command rules and the auto-close are in `packages/db/src/queue/match-requests.ts`.

Proposal (November 9, 2026). Player-side **Request a match** ([D-2026-11-09-05](../../../../mvp/decisions.md#d-2026-11-09-05)). `id`, `club_id`, `session_id`, `session_player_id` (the requester, scoped FKs), `player_id` (authenticated Player, linked to the unreleased slot), `format` (any of the six request formats; the session's `request_formats` must allow it at send time), `partner_session_player_ids` (ordered array, one entry per partner spot the format needs, null = Anyone; was a single nullable `partner_session_player_id` until November 9, 2026), `opponent_session_player_ids` (0–2 scoped refs; a join table if arrays are avoided), `status` (`open`, `added`, `declined`, `cancelled`, `closed`), `created_at`, `decided_at`, `decided_by_device`, `match_id` (nullable FK set when the QM's **Add to queue** creates the waiting match: `added`, named spots kept, “Anyone” spots filled from present players with the fewest games; **Decline** sets `declined`; the player's Cancel sets `cancelled`). Partial unique `(session_player_id) WHERE status = 'open'`. A request becomes `closed` when anyone named stops being present or when the session ends; the server does not judge fairness. QM decisions are ordinary club sync operations; the open-request count travels with the QM's existing refresh ([D-2026-11-09-05](../../../../mvp/decisions.md#d-2026-11-09-05)).

## Auto Queue handoff (October 31, 2026)

The generator was renamed **Generate matches** on November 6, 2026 (formerly called Auto Queue); this heading keeps its historical name. Generate matches suggestions are alternative drafts outside the accepted Main Queue. Planned load, ordered cross-tab selection, transfer revalidation and idempotency need reconciliation before backend implementation. Drafts do not create played results; distinct intentional rematches remain valid. Storage and synchronization details are not decided by this handoff.
