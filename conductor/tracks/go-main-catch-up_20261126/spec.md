# Track specification: Catch Go up with main

**Track ID:** go-main-catch-up_20261126 · **Type:** refactor · **Priority:** high (order 17) · **Created:** 2026-11-26
**Depends on:** regression-go, go-sign-in-catch-up · **Related:** BL-20 (its test fixes landed in #1114), BL-17, BL-19, [D-2026-11-14-01](../../../docs/mvp/decisions/2026-11-14.md#d-2026-11-14-01)

## Why

`main` (TypeScript Route Handlers and rules) was merged into `go-stack` again on 2026-11-26 (branch `main-into-go-stack`, 137 commits since the last merge base). The merge itself needed three owner calls (decision ID collision, profile masking, one open-decisions row; all answered). After it, Go is behind `main`'s Queue and Player behaviour, and `go test ./...` is red in several packages. The owner chose to open the merge PR with those failures listed and to catch Go up in a planned track. This track is that plan. **Nothing here is built or ported yet.**

Go answers for the moved areas, so every behaviour `main` added to a moved route must exist in Go before staging-verification, or the beta stack silently differs from production.

## Evidence (read 2026-11-26; re-check at task 1.1)

- **Notes:** `main-into-go-stack-stop.md` (merge result, red tests), `bl-20-diagnosis.md` (go-stack @ efde4e74: stale goldens vs missing Go changes), `queuewrites-goldens-recaptured-from-ts.patch` (356 KB; TypeScript recapture of the 13 `queuewrites` goldens).
- **Drift:** `git log` shows 137 commits on `main` since the merge base `25bacc46`. Seven new migrations: `20261123000300_club_player_saved_level`, `20261124000100_session_level_restriction`, `20261124000200_player_gender`, two named `20261125000100_*` (`session_back_to_preparation`, `session_court_position`), `20261125000200_session_player_handicap`, `20261126000100_match_almost_done`. New decisions: `2026-11-23.md` (10), `2026-11-25.md` (5), `2026-11-26.md` (10).
- **The recapture:** the patch changes 13 goldens. About 70 steps move from `500 internal "Something went wrong."` to `404 not_found "Not found."`, plus a handful of `invalid` and `conflict` answers (club 2, roster 3+1, rosterops 1, prep 1). Whether that is real TypeScript drift or a capture quirk (the capture builds a throwaway DB from `ROTRA_CAPTURE_DB_URL` with the Prisma migrations applied, `capture-writes-base.mjs:37`; the old goldens answered 500 for cases such as `venue_id_missing`) is **not known**. It decides whether the new goldens can be trusted.

## Requirements

Every requirement is accepted only when `go test ./...` for its area is green against goldens captured from the TypeScript, never regenerated from Go's own output.

### R1: Trust the goldens first (phase 1)

Decide whether the `internal` → `not_found` movement is TypeScript drift or a capture artifact, and recapture all affected goldens on a database that has every migration, including the seven above.

### R2: Queue response shapes (phase 2)

New fields the TypeScript sends that Go does not: `hosts` on the session where missing, `plannedBeforeStart`, `levelRestriction` (with slot counts), `handicapSpots`, `recordGames` semantics (D-2026-11-20-02: false means not ranked, results kept), court `position`, saved players' `phone`, level and gender, waitlist `addedAt` = `demotedAt ?? addedAt` (D-2026-11-23-06, strict first come, first served), and the match result shape (`autoPlaced`, `queueRevision`). Go already has `hosts`, `autoPlaced`, `queueRevision` and `recordGames` in some paths; the gap is by route (task 2.1 checks each).

### R3: New routes (phases 2 and 5)

Routes in `main` with no Go counterpart: `sessions/{id}/back-to-preparation`, `courts/order`, `matches/{id}/almost-done`, `pause`, `swap-from-match`, `switch-sides`, `trade-courts`, `matches/clear`, `roster/handicap`, `club/name-change`, `me/gender` (Player), the club leaderboard routes and `leaderboard` changes (four periods, D-2026-11-25-04), `matches/{matchId}` (Player), and the ten slot-transfer routes (seven `public-sessions/{slug}/slot-transfer/*` Player routes and three Queue transfer routes).

### R4: Sign-in goldens (phase 3)

`club_players` and `session_players` gained columns; the Go goldens for `auth/claim`, `auth/google`, `auth/register` and `signedin` were captured before that and must be recaptured and made to pass.

### R5: Shared rules (phase 4)

`rulecases.GoCopyPending` lists rules written in TypeScript first. This track adds the Go copy and removes the entry for `courts/expectedFinish` and `roster/levelRestrictionBlock` (`match/computeStandings` is already dense in Go, #1114; task 4.1 confirms). Later rules (match making, Plan Ahead, match category, exemption, handicap) follow in phase 5.

## Owner decisions this track needs (AGENTS rule 14)

Rules, results math, money, auth and migrations are not guessed. Each is asked at the task that needs it (marked **OWNER** in the plan):

1. Are the ~70 `not_found` answers the intended behaviour, or should TypeScript answer `internal`/`invalid` again? (1.2)
2. Which Go behaviour should follow when TypeScript and the docs disagree after recapture? (1.3)
3. Level restriction slot enforcement and the `levelRestrictionBlock` rule: is the TypeScript the rule to copy as written? (2.2, 4.2)
4. Handicap (D-2026-11-25-03): does it touch money or ranking in Go, or is it Queue Master read-only display for now? (2.5)
5. Expected finish (D-2026-11-23-08): confirm the scoring-mode lengths to copy. (4.2)
6. Leaderboards: periods, shared places, masking (D-2026-11-25-04) and the Go read model for rank math, which is not decided for Go. (5.1)
7. Slot transfer and payments between players: money, ten routes. Port now, or leave in TypeScript past the swap? (5.5)
8. Whether the match making factors, Plan Ahead and exemption rules move to Go at all before the swap (BL-1 style decision: they can stay on the device). (5.2)
9. Whether any new migration is needed for Go-only columns (none expected; stop and ask if one appears).

## Scope

**In:** Go code, goldens, rule cases and plan updates under `apps/api`, `packages/rule-cases`, `packages/rules-wasm`, docs and conductor.

**Out:** TypeScript or UI changes, GitHub issue creation (ask the owner), anything live on Railway or Supabase before staging-verification (B-52), the unresolved BL items (BL-17, BL-19, BL-21).

## Testing

Go: strict TDD ([workflow](../../workflow.md)). For each ported behaviour: capture the TypeScript golden first (red), then make Go pass (green). Real Postgres in tests, ≥ 80% coverage. A golden is only ever changed by a recapture from the TypeScript Route Handler; if Go disagrees, Go changes.

## Process notes

- **Scope guard (`backend.yml`).** A PR that mixes `apps/api` (or other backend paths) with app or package code fails the `scope` job and Railway skips the deploy. Each PR in this track is therefore Go, rule cases, wasm, docs and conductor only. TypeScript shared-rule edits are allowed only together with `packages/rule-cases/` in the same change. If a task finds a TypeScript bug, log it; do not fix it in the same PR.
- **Wasm.** A rule change rebuilds and commits `packages/rules-wasm` in the same PR; `make check` fails on a stale build.
- **Decision ID.** go-stack's regression decision was renumbered to `D-2026-11-25-06` in the merge; links in this track use the new ID.
- **Tickets.** Not created. The plan proposes one issue per phase under epic #869; the owner decides.
