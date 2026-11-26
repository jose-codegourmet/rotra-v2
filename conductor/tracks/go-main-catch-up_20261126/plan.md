# Plan: Catch Go up with main

**Track ID:** go-main-catch-up_20261126 · **Spec:** [spec.md](./spec.md)

Ticket: none yet (proposal: one issue per phase under epic #869, titled `<seq> · go-main-catch-up · Refactor: <phase>`; the owner decides). **Plan only: no Go or TypeScript has been written.** Every task is one commit, strict TDD (golden captured from the TypeScript first, then Go), and ends with its plan line ticked in the same commit. **OWNER** marks a stop-and-ask (rules, results math, money, auth, migrations).

## Phase 1: Trust the goldens

- [ ] **1.1** Diagnose the ~70 `internal` → `not_found` steps in the recapture patch. Re-run one failing capture (`venue_id_missing`, `venue_id_not_a_uuid`) against a throwaway DB that has all migrations (the seven new ones included) and read the TypeScript handler path that answers 404 now (compare `packages/db/src/queue/*` against the merge base). Write the verdict in this plan: real TypeScript drift, or capture-environment quirk (missing migration, stub, order of cases)
- [ ] **1.2** **OWNER** If drift: confirm `not_found` / `invalid` / `conflict` are intended for each group (club, roster, rosterops, prep, requests, money, match, finish, finalize, publish, visitor, details). One question per group, with the TypeScript line that decides it
- [ ] **1.3** Recapture all 13 `queuewrites` goldens from the TypeScript on a fully migrated DB and commit them red-first (Go tests fail where Go differs). Do not apply the patch from the notes folder as is, and never regenerate from Go
- [ ] **1.4** Fix Go for the ~70 status/code changes that 1.2 confirmed (small commits, grouped by golden file)

## Phase 2: Queue response shapes and writes (Go behind main)

- [ ] **2.1** Gap table by route: for each new field in R2, which Go reader or writer must send it and which golden covers it (`session`, `roster`, `courts`, `saved players`, `match result`). Write it under this task; add a failing golden per row
- [ ] **2.2** `levelRestriction` (all, beginners, beginners-intermediate, per-level slots; migration `20261124000100`) on session setup and reads; the invalid-slots answer (**OWNER**: enforcement rule, spec question 3)
- [ ] **2.3** `plannedBeforeStart` and `POST sessions/{id}/back-to-preparation` (migration `20261125000100_session_back_to_preparation`, owner decision of 2026-11-25)
- [ ] **2.4** Court `position` and `courts/order` (migration `20261125000100_session_court_position`); `matches/clear`, `trade-courts`, `switch-sides`, `swap-from-match`, `pause`
- [ ] **2.5** **OWNER** `handicapSpots` on roster entries and `roster/handicap` (migration `20261125000200`): read-only display or part of the math (spec question 4). Then build as answered
- [ ] **2.6** `matches/{id}/almost-done` (migration `20261126000100_match_almost_done`) and `recordGames` / result validation per D-2026-11-20-02: re-check that Go and the recaptured `match` golden agree; port the difference
- [ ] **2.7** Saved players: `phone`, saved level (`club_player_saved_level`), gender, the club-player create/edit changes in `club/players` and `club/players/{id}`; `club/name-change`; `join-requests/{id}/confirm` change
- [ ] **2.8** Match results shape: `autoPlaced` and `queueRevision` on every route that returns a match result; make the `match` golden pass
- [ ] **2.9** Waitlist order (D-2026-11-23-06): waitlist `addedAt` is `demotedAt ?? addedAt` in the Go public session read and the signed-in reads; golden from the TypeScript with a moved-off-roster player first

## Phase 3: Sign-in and Player goldens with the new columns

- [ ] **3.1** Recapture `auth/claim`, `auth/google`, `auth/register` and `signedin` goldens from the TypeScript on the fully migrated DB; list what changed
- [ ] **3.2** Fix Go where those goldens fail (claim and registration rows carry the new `club_players` / `session_players` columns; gender; verified, D-2026-11-23-07)
- [ ] **3.3** Player reads that changed on `main`: `matches/{matchId}`, `me/gender`, unclaimed shared-entry profiles by RTR ID (D-2026-11-23-05), the profile masking the merge settled (B-54, `isMasked`); goldens first

## Phase 4: Shared rules

- [ ] **4.1** Confirm the `ruleswasm` and `sessionresult` state after #1114: 308 cases through the envelope, standings dense. Record which entries remain in `rulecases.GoCopyPending`
- [ ] **4.2** **OWNER** `courts/expectedFinish` (D-2026-11-23-08, scoring-mode lengths) in `internal/rules`, remove it from `GoCopyPending`, rebuild and commit the `.wasm` and types
- [ ] **4.3** **OWNER** `roster/levelRestrictionBlock` in `internal/rules`, remove it from `GoCopyPending`, rebuild the `.wasm`
- [ ] **4.4** Run the whole rule-case set through Go and the wasm; update the hard-coded case count with the files on disk

## Phase 5: Later or optional (each needs the owner to say go, and may stay on the device or in TypeScript)

- [ ] **5.1** **OWNER** Club leaderboards and the four periods (D-2026-11-25-04): `clubs/{id}/leaderboard`, `leaderboard`, `leaderboard/me`; shared places, full names, always-on podium
- [ ] **5.2** **OWNER** Match making factors (D-2026-11-25-01), Plan Ahead (D-2026-11-23-09), match category and exemption rules: Go rule, cases, wasm, or decide they stay in TypeScript
- [ ] **5.3** Gender in the Go Player and Admin writes (`me/gender`, `AdminPlayerGender`) if not done in 3.3
- [ ] **5.4** Session done deducts planned shuttle tubes (D-2026-11-26-01): inventory write in Go finalize (**OWNER**: inventory is money-adjacent)
- [ ] **5.5** **OWNER** Slot transfer (money between players): seven `public-sessions/{slug}/slot-transfer/*` Player routes and three Queue transfer routes; port, or keep in TypeScript past the swap, stated in `ROTRA_GO_MOVED_AREAS`
- [ ] **5.6** Re-read `git log` and `docs/mvp/decisions` for anything merged to `main` after 2026-11-26; add tasks

## Phase 6: Close

- [ ] **6.1** `go test ./...` green; `make check` green; CI scope job green on every PR in the track
- [ ] **6.2** Update `tracks.md` (row 17, BL-20 text: its fixes landed in #1114, this track carries the rest), the MVP status board and each ported route's docs
- [ ] **6.3** Merge `main` into `go-stack` again if more than a week has passed; log new gaps

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
| 2026-11-26 | plan | Counts and routes come from `git diff`/`git log` of `origin/main` against the merge base (`25bacc46`) and the recapture patch; the Go-side gaps were found by grepping `apps/api` | Evidence for the plan, not a test run | Task 2.1 and 4.1 re-verify |
