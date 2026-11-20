# Plan: Queue writes and offline contract in Go

**Track ID:** go-writes-queue_20261113 · **Spec:** [spec.md](./spec.md)

Ticket: #878 (one issue for the whole track, under epic #869).

## Phase 1: Contract

- [x] **1.1** Characterize `operationId`, revisions and 409s
- [x] **1.2** Sync read/write and roster batch

## Phase 2: Commands

- [ ] **2.1** Preparation and roster (ported: session create/edit/switches/start/delete, court edit/remove, roster operations, waitlist, club invite/venues/settings/saved players; left: POST courts and both open-early routes need Auto Queue fill (2.3), the cost estimate beside a session needs 3.1, the club logo is an upload, saved-player Edit details)
- [ ] **2.2** Join and match requests (ported: join confirm/decline, match request add/decline, court-fill PATCH and POST with Auto Queue fill, drop-out keep/remove, PATCH saved player (Edit details), the Player's join, cancel, check-in, leave, drop-out, invite-code with their preflight; left: the Player's match-request POST and cancel and step-down (not named in the brief), the Queue visitor join-request (receipt cookie and secret: owner decision), `GET /api/public-sessions/{slug}/my-request`)
- [ ] **2.3** Match control and Generate matches add
- [ ] **2.4** Results, finalization, cancel/delete

## Phase 3: Money

- [ ] **3.1** Cost, payments, inventory (stop and ask)

## Phase 4: Events

- [ ] **4.1** Outbox event append in each write transaction

## Phase 5: Switch

- [ ] **5.1** Add this track's `/api/*` prefixes to the `ROTRA_GO_MOVED_AREAS` list (local now; the beta project gets the full list in staging-verification; remove a prefix to undo); replay a recorded offline session locally

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
| 2026-11-20 | 1.2 | A malformed session id, roster entry id, request id, saved player id or profile id in the roster batch: the TypeScript answers 500 (Prisma or the raw `::uuid` cast crashes). Go answers 404 `not_found` | no row can have that id; a 500 is a crash, not a contract | `goExpects` on those steps (`MALFORMED` in `gen-writes-queue-cases.py`) |
| 2026-11-20 | 1.2 | A malformed `operationId` where the service hands it to Prisma as a uuid (an add, an accepted request): TypeScript 500. Go answers 422 `invalid` with the field `operationId`. A `remove` or `declineRequest` never reads it, so there it is accepted, as before | same | `goExpects` on `v_malformed_operation_id_on_add` |
| 2026-11-20 | 1.2 | A subject that is not a club account (a Player's, or one with no account): TypeScript 403 `wrong_account`. Go answers 401, it has no sign-in identity for it | same as the Admin and Player writes | `goExpects` on the two `v_*subject*` steps |
| 2026-11-20 | 1.1 | The offline contract has no stored answer: a retry recomputes (a retried new-player add answers `emailWords: null`, a re-accepted request answers a null `rosterEntry`) and always bumps `queue_sessions.revision` again. Ported as is and pinned (`retry_*`, `accept_*_twice_*`) | the TypeScript does exactly this | none, listed for the owner |
| 2026-11-20 | 1.2 | `GET /api/sync` and `GET /api/sessions/{id}/sync` have no write side (`uploadOperations` and `sealStream` are out of scope), so there is nothing to port; the reads were ported with the signed-in reads | spec | none |
| 2026-11-20 | 1.2 | Which of two racing operations wins (the same player under two operation ids) is not decided; it is tested with what always holds in `race_test.go`, not pinned in the golden file | harness rule | none |
| 2026-11-20 | 1.2 | `estimateMinimum` and `sessionMinutes` had no Vitest cases (0 ported); `rules/sessionsetup/minimum.go` is pinned by a grid of 4,320 inputs captured from the real TypeScript | R3 | none |
| 2026-11-20 | 2.1 | Move to waitlist on a live session answers 422 `invalid` (no fields) in main: the level-lock trigger refuses releasing a locked entry (SQLSTATE 23001, which Prisma reports as P2003). A prepared session works. Go maps 23001 to `invalid` | port as is | pinned by `step_down_live_player` |
| 2026-11-20 | 2.1 | An exclusion violation (`queue_sessions_no_overlap`, SQLSTATE 23P01) is a 500 in main, though `mapDatabaseError` looks for it: Prisma gives it no code. Go no longer maps 23P01 to a conflict (the slice 1 mapping did) | port as is | pinned by `start_a_late_start_overlapping_a_finished_session` |
| 2026-11-20 | 2.1 | Start more than a day before the planned date answers 500 (the check `queue_sessions_schedule_check` refuses an end before the planned start) | port as is | pinned by `start_a_day_early_hits_the_schedule_check` |
| 2026-11-20 | 2.1 | A malformed id (court, roster entry, waitlist entry, saved player, session) where main crashes in Prisma: Go answers 404 `not_found` where the id names a row of the path or body (the same rule as slice 1). A malformed `courtId` or venue `id` in a body, a malformed court id in the edit form, `moved`/`into` ids of Move and the id of an issued registration link stay 500, as in main | no row can have that id | `MALFORMED` in the generators; the 500s are pinned as 500 |
| 2026-11-20 | 2.1 | Create and edit session read the body like main: a field of the wrong type is a 500 (a TypeError or a Prisma validation error). Go answers the same 500 at the same point; the order of the checks is pinned by the `create_*` and `edit_*` cases | port as is | none |
| 2026-11-20 | 2.1 | `POST /api/sessions` with an existing `commandId` and no `input` answers 500 after the retry succeeded (main reads `input.costEstimate`) | port as is | `create_retry_even_with_a_broken_form` |
| 2026-11-20 | 2.1 | A session create or edit that carries `costEstimate`, a court added or opened early on a running Auto Queue session, and `PATCH /api/club` with `logoUrl` answer 500 in Go for now (money slice 3.1, match control 2.3, uploads out of scope). The sessions are saved first, as main saves the estimate after the session | not ported yet | `TestUnportedPartsStop` |
| 2026-11-20 | 2.1 | Clash texts and the dates of a repeating series read the server zone in `sessionOccurrences` (main); the goldens are captured with `TZ=UTC` and Go uses UTC. A date text main's `Date.parse` accepts but is not an ISO date, or an ISO date-time with no offset in another zone, is not read the same | the servers run UTC | `parseInstant`, `session_rules_test.go` |
| 2026-11-20 | 2.1 | Lists main reads with no order get a tiebreaker: the clash candidates (start, id), the saved player found by phone (id), the other session running (id), the live entry of a saved player in the running session (confirmed, id) | rule 11 | none |
| 2026-11-20 | 2.1 | `POST presence` with a change that is no object: main crashes (null) or reads a missing id (a 500); Go answers 404 | rare | none |
| 2026-11-20 | 2.1 | Venue create and edit run without a lock in main (Edit preparation locks the session), so two edits at one revision can both win (a lost update). Ported as is; not pinned (race) | port as is | `TestRaceVenueWrites` |
| 2026-11-20 | 2.2 | A malformed session id on match request add/decline, court-fill, drop-out keep/remove, and a malformed request id on a join confirm/decline: TypeScript 500 (Prisma or a raw cast crashes). Go answers 404. A missing or malformed `operationId` on confirm: 500 there, 422 `invalid` with the field `operationId` here. A malformed match request or notice id is `not_found` in both | no row can have that id | `MALFORMED` and `BADOP` in `gen-writes-queue-requests-cases.py` |
| 2026-11-20 | 2.2 | Auto Queue fill is ported for the routes of this slice (`fillCourts` in `court_fill.go`). `courts.go` keeps its own stub for POST courts and open-early on a running Auto Queue session (still 500, `TestUnportedPartsStop`); the match control slice switches those two call sites to `fillCourts` with goldens | the court commands are slice 2.3 | none |
| 2026-11-20 | 2.2 | `requestLineup`, `allowedRequestFormats`, `requestSpots` and the refusal text had no Vitest case (0 ported); `rules/matchrequest` is pinned by a grid of 270 lineups, 12 format sets, the spots and the labels captured from the real TypeScript. The wasm fingerprint changed (a non-test file under `internal/rules`); the wasm binary did not | R3 | none |
| 2026-11-20 | 2.2 | Edit details: the phone another saved player already has is found with no order in main; Go reads the lowest id. A malformed saved player id: 500 there, 404 here | rule 11 and the slice 1 rule | none |
| 2026-11-20 | 2.2 | The Player's routes allow the configured Queue origins (`ROTRA_QUEUE_ORIGINS`); the Route Handler also checks the Queue origin is paired with the Player origin it was called on, which Go cannot (as the signed-in reads of this app) | one config for both | none |
| 2026-11-20 | 2.2 | `POST /api/public-sessions/{slug}/join` with a body that is not JSON: the Route Handler reads the body before the pass and outside its handler, so the error is uncaught (a Next 500 with no CORS headers). Go checks the pass first, then answers 422 `invalid`. Not pinned (the capture cannot record a throw) | a 500 is a crash, not a contract | none, listed for the owner |
| 2026-11-20 | 2.2 | `session_join_requests.invite_code_id` is never written by a Player's join in main; Go does not write it either (open decision) | port as is | none |
| 2026-11-20 | 2.2 | The queue seed did not delete `session_invite_codes` between cases, so a row leaked from one case to the next; it does now (the older groups never wrote one) | harness | `queue.seed.sql` |
| 2026-11-20 | 2.2 | The invite code of a Player is random (`makeInviteCode`, modulo bias kept); a taken code or a parallel first call is retried up to five times, each try in its own transaction, as in main. The race is pinned as "both answer the same code" | port as is | `invite_two_at_once` |
