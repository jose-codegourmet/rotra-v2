# Plan: Catch Go up with main

**Track ID:** go-main-catch-up_20261126 · **Spec:** [spec.md](./spec.md)

Ticket: none yet (proposal: one issue per phase under epic #869, titled `<seq> · go-main-catch-up · Refactor: <phase>`; the owner decides). **Plan only: no Go or TypeScript has been written.** Every task is one commit, strict TDD (golden captured from the TypeScript first, then Go), and ends with its plan line ticked in the same commit. **OWNER** marks a stop-and-ask (rules, results math, money, auth, migrations).

## Phase 1: Trust the goldens

- [x] **1.1** Diagnose the ~70 `internal` → `not_found` steps in the recapture patch. Re-run one failing capture (`venue_id_missing`, `venue_id_not_a_uuid`) against a throwaway DB that has all migrations (the seven new ones included) and read the TypeScript handler path that answers 404 now (compare `packages/db/src/queue/*` against the merge base). Write the verdict in this plan: real TypeScript drift, or capture-environment quirk (missing migration, stub, order of cases)

  **Verdict (2026-11-26): real TypeScript drift, not a capture quirk.** Captured at `go-stack` `ac251c58` on a throwaway `postgres:16-alpine` with all 59 migrations on the branch applied in sorted order (what `openCaptureDb` in `capture-writes-base.mjs` does; CI never runs the capture, it only runs the Go tests against the goldens), Prisma client regenerated (7.10.1), `TZ=UTC`, all 17 `capture-writes-queue` groups: 17/17 pass, and the result equals the notes patch line for line except random ids in `publish`. Note: `origin/main` has 60 migrations; `20261126000100_match_almost_done` (task 2.6) is not on this branch yet.
  - **500 `internal` → 404 `not_found`: 70 steps, one cause.** `main` #1108 (`c71423a2`) added `isMalformedId` in `packages/db/src/service/handler.ts:37`: any Postgres `22P02` (a value that is not a UUID) answers 404. Its comment says "a malformed id in the URL", but it fires on any 22P02, body fields included. All 70 steps carry `allow500` (the old goldens recorded the TypeScript crash). **Go did not copy the 500: the cases already say what Go answers (`goExpects`).** Against the new 404:
    - **47 agree** (`goExpects` 404): ids in the URL path or in a batch operation (`*_malformed_session_id`, `delete_malformed_id`, `remove_malformed_id`, `place_malformed_match_id`, `add_saved_malformed_player_id`, ...). Go needs no change; only the golden's TypeScript side moves.
    - **12 differ** (`goExpects` 422, TypeScript now 404): a missing or malformed `operationId` / `commandId` in the body: match `place_missing_operation_id`, `add_malformed_operation_id`, `add_missing_operation_id`, `edit_missing_operation_id`; publish `publish_without_a_command_id`, `publish_a_malformed_command_id`; requests `confirm_missing_operation_id`, `confirm_malformed_operation_id`; roster `v_malformed_operation_id_on_add`; rosterops `add_saved_missing_operation_id`, `level_missing_operation_id`, `slot_missing_operation_id`. The TypeScript never answered 422 here: the routes pass `text(body.operationId)` to the service with no check, so these steps were 500; the 422 is Go's own choice, and the guard now makes them 404. Not every one may have reached Postgres before (`derivedId`, `packages/db/src/queue/session-store.ts:277`, hashes any string): check each of the 12 against the old golden in 1.4.
    - **10 have no `goExpects`** (Go answers whatever the golden says, so the recapture flips them): club `venue_id_missing`, `venue_id_not_a_uuid`, `move_malformed_id`, `move_into_missing`, `link_malformed_id`; money `create_a_line_with_an_item_that_is_not_a_uuid_crashes`; prep `create_venue_not_a_uuid`, `edit_court_id_not_a_uuid`, `court_add_id_missing`, `court_add_id_not_a_uuid`.
    - **1 differs the other way** (`goExpects` 200): visitor `mine_a_request_id_that_is_not_a_uuid_with_a_valid_receipt`.
  - **Other status changes (10 steps), checked against the docs:**
    - Court labels may repeat (`create_duplicate_court_labels`, `court_add_duplicate_label`, `edit_a_new_court_with_the_label_of_a_kept_one` 409 → 200/201; `court_edit_duplicate_label_is_a_crash` 500 → 200): decided, `docs/business_logic/product/queue/modules/sessions/README.md:204` (owner, November 25, 2026; #1105). Not a question.
    - Phone needs an email or social link (`add_new_guest*`, `player_add_guest_with_nickname_and_phone` → 422 `invalid`): decided, D-2026-11-23-03 (`docs/mvp/decisions/2026-11-23.md:42`; #1031). Not a question.
    - `publish_with_record_games_off` 422 → 200: decided, D-2026-11-20-02 ("Publish results all work" with Record games off; #1080). Not a question.
    - `move_a_playing_match` 409 → 200: decided, `docs/business_logic/product/queue/modules/matches/README.md:37` (owner, November 19, real mode November 25; #1108). Not a question.
  - **Same status, new body or rows (about 380 steps):** `handicapSpots`, `levelRestriction`, `plannedBeforeStart`, court `position`, `recordGames` in status, `hosts`, and new columns in the database snapshots. These are Phase 2, not this question.
  - **Trust and how to capture:** the recapture is TypeScript truth for this commit and reproducible. Do not apply the notes patch as is (it carries the Phase 2 shapes and the random `publish` ids). Capture on a fresh container per run, all migrations, `prisma generate` first, `TZ=UTC`, never from Go.
  - **Owner questions left for 1.2:** (a) a missing or malformed `operationId` / `commandId` in the body: should it stay 422 (fix the guard so it covers only ids named in the URL or a lookup, and TypeScript goes back to 422), or become 404 as the 12 steps now show? (b) the same for a malformed id in a body lookup (`venue_id`, `courtId`, `intoClubPlayerId`, line item): 404 is plausible, but no document says it; confirm per group. (c) the visitor `my-request` with a non-UUID request id: 404 now, Go says 200.

- [x] **1.2** **OWNER** If drift: confirm `not_found` / `invalid` / `conflict` are intended for each group (club, roster, rosterops, prep, requests, money, match, finish, finalize, publish, visitor, details). One question per group, with the TypeScript line that decides it
  - **Confirmed by the owner, 2026-11-26 (all four):** (1) a malformed id answers 404 on every route group, not only where the id is in the URL (`isMalformedId`, `packages/db/src/service/handler.ts:37`, main #1108); (2) court labels may repeat within a Session (#1105); (3) a guest phone needs an email or a social link (#1031); (4) Publish with Record games off is allowed (#1080, D-2026-11-20-02). Go follows TypeScript on all four in task 1.4.
- [x] **1.3** Recapture all 13 `queuewrites` goldens from the TypeScript on a fully migrated DB and commit them red-first (Go tests fail where Go differs). Do not apply the patch from the notes folder as is, and never regenerate from Go
  - **Done 2026-11-27, red on purpose.** Captured from the TypeScript at `go-stack` `73b82ac6` on a fresh `postgres:16-alpine`, all 59 migrations, `prisma generate` first, `TZ=UTC`: 17 of 17 capture tests pass and 13 goldens change (club, details, finalize, finish, match, money, prep, publish, pubmr, requests, roster, rosterops, visitor). `publish_with_record_games_off` now answers 200, so the generator gives it the same `redact` as `publish_both_slides` (random publication ids). Go fails 12 `queuewrites` golden tests until Phase 2 and task 1.4: `TestRosterBatchGolden`, `TestRosterOpsGolden`, `TestSessionPrepGolden`, `TestClubWritesGolden`, `TestRequestsGolden`, `TestEditDetailsGolden`, `TestMatchControlGolden`, `TestSessionFinishGolden`, `TestPublicMatchRequestGolden`, `TestPublishResultsGolden`, `TestMoneyGolden`, `TestFinalizeGolden`. Nothing was regenerated from Go.
- [ ] **1.4** Fix Go for the ~70 status/code changes that 1.2 confirmed (small commits, grouped by golden file)
  - **Notes for 1.4 (from a review of the 1.1 findings, 2026-11-27; code read, nothing run):**
    - The confirmed answer 1 says "every route group". It does not say whether it covers the 12 `operationId` / `commandId` steps (idempotency keys, not lookups). Go answers 422 there. **OWNER, one more question:** for example `POST /api/sessions/{id}/matches` with `{"operationId": "x"}`: Go answers 422, the TypeScript now answers 404 (unverified for each of the 12 until the old goldens are checked: some may never have reached Postgres). Should both say 404, or both 422 (then TypeScript gets an up-front UUID check)? No user sees the difference: the clients always send `crypto.randomUUID()` ids (`packages/data/src/outbox/dispatch.ts`), and `realRequest` handles 404 and 422 the same way (kind `permission`), so answer whichever is simpler. Do not change Go on those 12 until it is answered. Of the other 58: 47 need no Go change, 10 need the Go mapping below, 1 is the visitor step.
    - **Owner answer, 2026-11-27: 404.** The 12 `operationId` / `commandId` steps answer 404 in Go and TypeScript, so Go changes to match (no TypeScript change, no up-front UUID check). The "If the answer is 422" note below is not used.
    - If the answer is 422: add one shared check next to `text` in `packages/db/src/service/request.ts`, called inside each route's `handleAccountRequest` callback or at the top of the service function, never only in `isMalformedId` (the error carries no origin). Mind the order: a route-level check turns a 404 for an unknown session or match into a 422.
    - The 10 steps with no `goExpects` (body lookup ids) get `goExpects` 404 for a malformed id and 422 for a missing field, through one shared mapping of a failed `uuid.Parse` in Go.
    - Client note: a malformed id of any kind now 404s, and the outbox stops at the first non-409 error (`replayFailureOf`, `outbox.rules.ts:128`), so an offline-created id replayed without its alias (`aliasArgs`) would stall the queue behind it. Same for 404 and 422; no `randomUUID` id can cause it.
    - The visitor `my-request` step (Go 200 with `null`, TypeScript now 404): the route documents that a receipt that no longer matches reads as `null`, so the TypeScript is the likely side to change: test the UUID shape of `requestId` in `parseReceiptCookie` (`apps/queue/src/app/api/public-sessions/[slug]/receipt-cookie.ts`) and read a bad cookie as no receipt. Needs the owner's yes (not part of the four answers). Also check the join-request POST route (it reads the same cookie) and that `handleVisitorRequest` does not swallow the 404.


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
