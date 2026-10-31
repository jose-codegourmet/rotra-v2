# Shared queue, matches, and substitutions

**Status:** Proposed data model implementing confirmed business outcomes. Updated October 26, 2026 for the [ROTRA Queue prototype](../../../../../app/mocksups-app/queue-app/rotra-queue.html).

## `matches`

| Field | Type / rule |
|---|---|
| `id`, `club_id`, `session_id` | UUID keys with scoped FKs |
| `match_no` | Positive integer assigned in creation order per session ("Match 7"); unique `(session_id, match_no)`; never reused or renumbered. Offline devices need a collision-free allocation (for example a device-scoped block) or a server-assigned number on sync — open |
| `state` | Proposed waiting/active/completed/invalid; removed waiting drafts are excluded from dispatch without becoming played games |
| `format` | Singles, doubles, fun_1v2, fun_3v3, fun_4v4, fun_5v5 |
| `queue_position` | Nullable bigint order key; meaningful while waiting |
| `removed_at` | Nullable timestamp for discarded waiting drafts; never a played-game outcome |
| `origin` | `manual` (Add match, Make match), `suggested` (accepted suggestion), `auto` (Auto queue, Regenerate) |
| `manual_protected` | True for manually created matches and for any waiting match the operator edited. False for accepted unedited suggestions and auto output |
| `generation_id` | Optional UUID grouping a generation/rebuild command, not a new product feature |
| `attention_reasons` | Derived projection/cache of validated lineup problems |
| `started_at`, `ended_at`, `revision` | Transition metadata |

Do not add a mandatory court FK to a waiting match. Index `(session_id, state, queue_position, id)` for non-removed rows to scan the shared queue. Reorder/regenerate under a locked session queue revision; use a deterministic tie key during draft ordering and establish unique canonical waiting positions at commit.

A participant already playing makes a waiting match temporarily ineligible, not automatically broken. Availability/removal problems can mark Needs attention. Healthy manual matches survive regeneration; active matches always survive. Removing unused automatic drafts must retain enough operation identity to make replay idempotent.

Queue position is advisory: any ready waiting match may start regardless of position, so the start command validates eligibility, not "is first in queue". Regenerate gives each rebuilt match the `queue_position` of a match it replaces, so rebuilt work stays where the old work was.

Standard formats that are off for the session (`allow_singles`/`allow_doubles` false) are rejected for new or edited matches by command validation. Fun formats are always accepted for manual matches and never produced by generation.

At Session done, waiting matches that never started are excluded from results. Whether they are kept (state waiting, frozen) or marked removed is part of the open closure policy; either way they produce no facts.

## `match_participations`

Fields: UUID `id`; `club_id`, `session_id`, `match_id`, `session_player_id`; `team` A/B; positive `segment_no`; `joined_operation_id`, nullable `left_operation_id`; corresponding local sequence/time evidence; `started_with_match`; `finished_with_match`.

Use scoped FKs to the match and roster entry, and unique `(match_id, session_player_id, segment_no)`. Keep successive segments for a player who leaves and returns. Store/reconstruct the lineup before start without falsely claiming they played.

Full participation is derived only when the player was present for the entire completed match with no gap. A pre-start substitution does not count as a participation gap. Both sides of an in-game substitution lack full-game credit even if the outgoing player later re-enters.

Team membership and locked level come from the session entry/recorded lineup, not today's profile rank. Preserve this evidence for opponent/partner calculations. Do not trust a client-provided `performance_eligible` boolean.

Team-size validation is transactional at start: singles 1/1, doubles 2/2, 1v2 1/2, 3v3 3/3, 4v4 4/4, 5v5 5/5. Fun 5v5 requires exactly two courts; every other format requires exactly one.

Partial participants (both sides of an in-game substitution) are excluded from session W/L, games, and award inputs, as well as from minimum credit and global performance.

## Court and player occupancy

`match_court_usage`: historical `(club_id, session_id, match_id, court_id)` assignment with acquire/release operation references; supports two courts for 5v5.

`active_court_holds`: one row per occupied court; PK `court_id`, scoped session/match FKs.

`active_player_holds`: one row per active roster player; unique `session_player_id`, scoped match FK, and nullable canonical `player_id` with a partial unique index when known. The global-player hold catches known overlapping active use across sessions; unknown duplicate guests cannot be identified automatically.

Acquire all required holds in a single transaction when accepting a start, in stable key order. Substitution releases the outgoing hold and acquires the incoming hold atomically. Completion/invalidation releases all match holds in the same transaction as the terminal decision.

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
