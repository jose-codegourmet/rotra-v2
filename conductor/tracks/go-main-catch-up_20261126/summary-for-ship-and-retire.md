# Go catch-up with `main`: summary for ship-and-retire

**Written:** 2026-11-28 · **Track:** [go-main-catch-up_20261126](./plan.md) (28 of 32 tasks done; the rest is below)
**For:** [ship-and-retire_20261113](../ship-and-retire_20261113/plan.md) · **State:** `go-stack` at `5a3aebb1`, last `main` merge `0da79301` (2026-11-27)

## What is true now

- On `go-stack`, `go test ./...` has no failure and `make check` passes (run on the merged tip, 2026-11-28).
- Every behaviour `main` added to the Queue and Player apps up to 2026-11-27 is in the Go API, except what is listed under "Left in TypeScript".
- Goldens were captured from the real TypeScript handlers on Postgres 16, never from Go. Where Go differs from the TypeScript on purpose, it is listed under "Deviations".
- Shared queue rules (AGENTS rule 16): `GoCopyPending` is empty. 50 case files, 493 cases run in Go, in `@rotra/data` and through the wasm wrapper; the committed `.wasm` is current (a second build is byte-identical).

## What was added in Go (new routes)

| Area | Routes |
|---|---|
| Session and courts | `POST sessions/{id}/back-to-preparation`, `PATCH sessions/{id}/courts/order`, session host lists on create and edit, `levelRestriction` on setup and every read, `plannedBeforeStart` |
| Matches | `matches/clear`, `matches/{id}/almost-done`, `pause`, `swap-from-match`, `switch-sides`, `trade-courts`, move a playing match (`canMovePlaying`) |
| Roster | `PATCH sessions/{id}/roster/handicap`, `handicapSpots` on every roster entry, level restriction block on join and place |
| Money | `payments/free`, `payments/refunds`, public `payment-status`, plays free in the estimate and totals, Session done deducts planned shuttle tubes |
| Slot transfer | Queue `requests/transfers/{id}/approve`, `reject`, `refund`; Player `public-sessions/{slug}/slot-transfer` and `lookup`, `withdraw`, `link`, `link/read`, `link/claim`, `link/withdraw` |
| Saved players and club | `PATCH club/players/{id}/name`, `POST` and `DELETE club/name-change`, saved level, social-link keys, gender |
| Player | `POST me/gender`, `POST me/onboarding-answers`, `GET matches/{matchId}`, `GET leaderboard` (four periods), `GET clubs/{clubId}/leaderboard`, unclaimed people found by RTR ID (`rtr-ids`, profile, clubs), win chance and Upset on games, registration from the Admin link (`POST register`, `register/google`) |
| Shared rules (Go + cases + wasm) | `matchCategory`, `matchLabel`, `winChance`, `winChanceBreakdown`, `formRating`, `isUpset`, `formFromHistory`, `expectedFinish`, `levelRestrictionBlock`, `canMovePlaying` |

Every new write route is classified in `apps/api/internal/liveupdates/routes.go`; the audit tests pass.

## For `ROTRA_GO_MOVED_AREAS`

The new routes live under prefixes that already move to Go (`/api/sessions`, `/api/club`, `/api/me`, `/api/public-sessions`, `/api/players`, `/api/rtr-ids`, `/api/matches`, `/api/leaderboard`, `/api/clubs`). Two things to check when the list is set at staging verification:

1. `POST /api/register` and `POST /api/register/google` (Admin link) are new Go routes. `docs/backend/google-sign-in-setup.md` says `/api/register` is not in the moved areas and that club-invite Google registration moves with an exact-path entry; decide whether the Admin-link registration moves with them.
2. The Player slot-transfer routes are now in Go, so slot transfer no longer needs to stay in TypeScript past the swap.

## Left in TypeScript (decided, not forgotten)

- **Match making and Plan Ahead** (`restAfter`, `freshPick`, the Plan Ahead pool and ranking): device-only draft strategy. Their only caller is `generateAutoQueueMatches` on the device; the server only checks reviewed drafts (`queuegen.DraftConflict`, already in Go). Owner confirmed on 2026-11-28. Do not delete `matchMaking.rules.ts` or `planAhead.rules.ts` when removing the TypeScript services. If the server ever generates drafts, they become shared rules.
- **The exemption list** (D-2026-11-19-07): mock state only, no table and no Go route.

## Deviations (Go differs from the TypeScript on purpose)

- A weak password on the Admin link or club link: the TypeScript checks the policy at the provider after staging (503, a staged registration left behind); Go checks it before staging (422, nothing staged).
- `unresolvedGuests` in `finalization.ts` has no `orderBy`, so its order follows the table's physical order; two finalization cases differ per run in the TypeScript. They were kept; Go sorts.
- A `null` row in a published copy's standings fails the read with a 500 in the TypeScript; Go does the same (case `standings_with_a_null_row_fails`).
- Back to preparation with an On court match answers 500 in the TypeScript (a CHECK refuses the court release); Go does the same. This is a TypeScript bug to raise with the owner, not fixed.
- `link/read` (slot transfer) reads on the pool, not one snapshot.
- Live-update kinds for the new routes are this track's choice, not derived from the TypeScript (it writes one `session` event).

## Not covered by any golden

- A signed-in viewer on an unclaimed person saved by two clubs, and Compare against an unclaimed person's id (the capture harness has no sign-in for those reads).
- The `go` CI job and the `scope` job on `main` after the merge: read them from GitHub; this summary only states what was run locally.

## Still open in the track

- **6.3:** merge `main` into `go-stack` again (due about 2026-12-03). The last merge was recorded as ancestry only (no tree change), so it should be small.
- Nothing else needs an owner answer.

## For ship-and-retire

- Task 1.1 (regression against beta) and 3.2 (regression on local Postgres + Go) can assume the list above; the `apps/e2e` suite is the check for the new routes.
- Task 3.1 (remove Route Handlers and services): keep the TypeScript rules in `@rotra/data` that the device still runs (match making, Plan Ahead, exemption, win chance chips); remove services and handlers only for routes Go now serves.
