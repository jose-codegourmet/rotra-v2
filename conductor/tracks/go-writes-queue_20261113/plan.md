# Plan: Queue writes and offline contract in Go

**Track ID:** go-writes-queue_20261113 · **Spec:** [spec.md](./spec.md)

Ticket: #878 (one issue for the whole track, under epic #869).

## Phase 1: Contract

- [x] **1.1** Characterize `operationId`, revisions and 409s
- [x] **1.2** Sync read/write and roster batch

## Phase 2: Commands

- [ ] **2.1** Preparation and roster
- [ ] **2.2** Join and match requests
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
