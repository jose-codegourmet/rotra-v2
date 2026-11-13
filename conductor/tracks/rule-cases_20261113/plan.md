# Plan: Shared rule-cases package

**Track ID:** rule-cases_20261113 · **Spec:** [spec.md](./spec.md)

Epic: #788 (F08 · Go API). Tickets: #789 (package and cases, PR #785), #790 (Vitest runner, PR #786); follow-ups #791 (remaining cases) and #792 (delete duplicated checks).

## Phase 1: Package

Ticket: #789

- [x] **1.1** Create `packages/rule-cases` with `exports` and the case JSON Schema
- [x] **1.2** Add a check that every case file matches the schema (`node:test`, see deviations)

## Phase 2: Move cases (no behavior change)

JSON files land in the backend PR; the Vitest switch is a separate frontend PR (see spec).

Ticket: #789 (JSON) · #790 (Vitest runner)

- [x] **2.1** Session cost and payments
- [x] **2.2** Match, auto-queue and auto-fill rules
- [x] **2.3** Session result and ranking settings
- [x] **2.4** License and club rules
- [x] **2.5** Money, phone and court-window parsing (`@rotra/schema`)

## Phase 3: Verify

Ticket: #790

- [x] **3.1** Compare case counts before/after; record them in the plan (below)
- [x] **3.2** `make check` passes; PR lists what was verified (`make check` passed on `feat/rule-cases-vitest`, which holds both PRs' content; `node --test` in the package passes. Not run: Go side, browser checks)

## Case counts (task 3.1)

Counted by running the existing Vitest files with a recorder (it logged each rule call and the assertion made on its result), so values are copied, not retyped. `assertions` counts each `expect` run (`it.each` rows included), baseline `expect(` text counts in the spec's files were 22, 16, 76, 29, 18, 39, 19, 56, 39, 5, 6, 32.

| Area (source test) | Assertions run | Moved to JSON | Left in TypeScript |
|---|---|---|---|
| session-cost | 22 | 16 (+1 repeat) | 5 |
| session-payment | 16 | 15 | 1 |
| match (`match.rules`) | 79 | 59 | 20 |
| match (`autoQueue.rules`) | 36 | 3 | 33 |
| match (`autoFill.rules`) | 18 | 17 | 1 |
| session-result | 39 | 20 (18 under `session-result/`, rest under `match/`) | 18 |
| ranking-settings | 142 | 135 (+5 repeats) | 2 |
| license | 77 | 63 (+3 repeats; `manila-today` dropped, see deviations) | 11 |
| club | 39 | 37 | 2 |
| money, phone | 11 expects, 24 and 13 table rows | 37 | 3 rejects (Infinity, NaN) and the composed phone round trip |
| court-window | 32 | 0 | 32 |

Total in JSON: 403 cases in 66 files. The Vitest runner (`packages/data/src/ruleCases.rules.test.ts`) runs all 403 against the real rules; all pass.

### Follow-up (#791): more cases

Total now 437 cases in 70 files. The recorder now tags non-JSON args (`$date`, `$undefined`, `$number`, `$constant` for `rng`; see `case.schema.json`) and writes a list length as an array of `{}`. Before this, `undefined` arguments had been written as `null` (e.g. `paymentStatus(undefined, due)`); they are now exact.

| Area | Assertions run | In JSON | Still in TypeScript |
|---|---|---|---|
| match (`autoQueue.rules`) | 36 | 20 (was 3) | 15 (`toContain`, `.not`, mutation checks, `Set` sizes) |
| license | 77 | 66 (`manila-today` back, with `$date`) | 8 |
| court-window | 37 | 13 (zone-free rules only: `sessionWindowError`, `courtWindowError`, `courtTimeOnSession`) | 24 (`courtWindowPreview`, `courtNextDay`, `instantOnDate`, `clockTimeFrom`, locale copy) |
| match, session-result | 79, 39 | 61, 20 | 18, 18 |

### Follow-up (#791): derived-value cases

43 more cases (480 in all; 553 tests in the runner) cover the rule calls behind the checks that had no direct case: `generateAutoQueueMatches` (7), `computeStandings` (11), `nextMatchCandidates` (2), `autoFillPlacements`, `creditedPlayers` (4), `onCourtMatches`, and in `session-result`: `sessionStandings` (6), `computeAwards` (5), `paginateStandings` (3), `buildExportFrames`. Each case holds the exact result today, so the check the old test made (`toContain`, `.some`, `Set` size, `.map`, `toBeLessThan`) holds because the whole result is pinned. They were captured by the recorder from the rule call the test used, not retyped. `expected` now decodes the tagged values too.

The old assertions that compared two results or the inputs (no mutation of `input.ctx`, same result twice for the same input) stay in TypeScript: they are not a property of one output.

### Follow-up (#792): duplicates deleted

Now 749 cases in 121 files (218 of them for the player, admin player, club player stats, contact change request, feature flag, queue session and sales rules, which were added to the scope on November 13, 2026 because a shared rule needs one test for both sides; the rest is the 50 more than before: the rule calls behind the remaining derived checks, `toBeUndefined` with `{"$undefined": true}`, error text, `Infinity`/`NaN` for money, and `Map`/`Set` results as `{"$map": …}` / `{"$set": …}`).

Deleted from the old test files every assertion that now exists as a case: 269 statements matched by the recorder to their line, then the derived-value checks (about 50 more), the empty `it`/`describe`/loops, and the files left with no tests (`autoFill.rules.test.ts`, `sessionPayment.rules.test.ts`, `sessionResult.rules.test.ts`, `money.test.ts`, `phone.test.ts`, and the player, visibility, admin player, management, contact change request, queue session and sales test files). Kept in TypeScript, because they are not a property of one rule's output: "input is not mutated" (`expect(input.ctx).toEqual(before)`), a rule that throws, a constant (`DEFAULT_POST_TEMPLATE`), a fixture check, "no `notes` key" (subset matching can't say a key is absent), the relation between two calls, and the time zone-dependent court-window checks (waiting for T6). The data package went to 1185 tests, of which 871 are the runner (the old test files shrank, the runner grew); four failures in `autoQueue.mutations.test.ts`, `player/fetchers.test.ts` and `queue-session/fetchers.test.ts` also fail on the branch before this change.

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
| 2026-11-13 | 1.2 | Shape check uses `node:test`, not Vitest | A Vitest or Ajv devDependency would change `pnpm-lock.yaml`, which backend CI's `scope` job rejects | **Owner, 2026-11-13: accepted.** `packages/rule-cases/check-cases.test.mjs`, no dependencies |
| 2026-11-13 | 2.x | Cases were extracted by a recorder, not retyped; assertions on derived values (`.map`, `.length`, `toHaveLength`, mutation checks, `.not`) stay in TypeScript | Those are not input to expected pairs of one rule call | Left in the existing `*.rules.test.ts`; counted above. **Owner, 2026-11-13:** rewritten as one call + `input.select` in #791, Auto Queue first, before Auto Queue moves to Go; ranking cases need sign-off |
| 2026-11-13 | 2.x | `expected` is a deep subset of the result (and `input.select` picks a path) | Matches `toMatchObject` and `.result`-style assertions exactly; for `toEqual` it no longer flags extra keys in the result | **Owner, 2026-11-13: keep subset.** Written into `case.schema.json`; the Go runner uses the same comparison |
| 2026-11-13 | 2.4 | `license/manila-today` dropped | Its inputs are `Date` objects, which JSON can't carry faithfully | Stays in `license.rules.test.ts`. **Owner, 2026-11-13:** dates go in as a tagged value `{"$date": "<ISO 8601 UTC>"}` (a `Date` in Vitest, a `time.Time` in Go); added and moved in #791 |
| 2026-11-13 | 2.5 | `court-window` not moved | Its tests build `Date` values in the machine's local time zone, so the cases would differ by machine; the zone rule needs an owner decision | **Owner, 2026-11-13: split by zone** (#791). Zone-free rules (`sessionWindowError`, `courtWindowError`, `courtTimeOnSession`) move with fixed UTC epoch ms; cases whose result is the locale-formatted `courtAfterSessionEndError` copy stay. `instantOnDate`, `clockTimeFrom`, `courtNextDay` stay in TypeScript until the club time zone (T6, Asia/Manila) is built |
| 2026-11-13 | 2.x | Original assertions not yet deleted from the moved test files | Deleting by hand risks changing what is tested; the runner proves the JSON matches the rules first | **Owner, 2026-11-13:** deleted in their own PR, #792, after #789 and #790 merge |
| 2026-11-13 | 2.x | Derived-value checks became golden cases (whole result pinned) | `toContain`, `.some`, `Set` size and similar have no JSON form; the full result is a stronger check | Mutation and determinism checks stay in TypeScript |
| 2026-11-13 | 1.1 | Runner reads JSON by path, not through an `@rotra/rule-cases` dependency | Same lockfile reason, and the Go tests read by repo path too | None needed |
