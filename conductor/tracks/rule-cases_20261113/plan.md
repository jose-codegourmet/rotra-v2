# Plan: Shared queue rules (one Go copy, run on the device as WebAssembly)

**Track ID:** rule-cases_20261113 · **Spec:** [spec.md](./spec.md)

Ticket: #870 (one issue for the whole track, under epic #869).

Only **bucket 1** (shared) rules get JSON cases and a WebAssembly build; see the spec for buckets 2 and 3. Phases 2–3
need nothing; phases 4–6 need go-api-foundation's Go module. If the spike fails, phases 5–6 are
replaced by the [fallback](./spec.md#fallback-if-the-spike-fails).

## Phase 1: Spike (R0, throwaway branch `spike/rules-wasm`)

- [x] **1.1** Build `canPlace`, `waitMinutes`, `courtOpen` to WebAssembly with standard Go and with TinyGo, behind a wrapper
- [~] **1.2** Measure size, phone load time, court-fill call cost, Vitest, mock mode, offline load, Vercel build
- [x] **1.3** Record results below; pick the tool by the B-21 rule; owner asked only if both tools fail (pass marks confirmed 2026-11-14, size 1.5 MB)

## Phase 2: Cases package and shapes (R1, R2) · `main`

- [x] **2.1** Create `packages/rule-cases` with `exports` and no barrel; cases under `v1/` (B-22)
- [x] **2.2** JSON Schema for rule cases and command cases (`now` where a rule reads the clock)
- [x] **2.3** Vitest check that every case file matches the schema

## Phase 3: Bucket 1 cases, no behavior change (R3, R4) · `main`

JSON files and the Vitest switch go in separate PRs (see spec).

- [x] **3.1** Match guards: `canPlace` / `canStart` / `canMoveCourt` / `canReplacePlayer`, `swapTarget`, `validateResult`, team sizes
- [x] **3.2** Game counts: counted games, substitution credit, games adjustment, `waitMinutes`, standings
- [x] **3.3** Court fill: `autoFillPlacements`, `nextEligibleForCourt`, `nextMatchCandidates` (new), `putOnCourt`
- [x] **3.4** Courts and time: court open / early / booking ended, session end and court conflict
- [x] **3.5** Roster: step-down guard, duplicate, slots, waitlist fill order and give slot (new)
- [x] **3.6** Language-edge cases (new): standings ties with accented and mixed-case names, rounding edges, court-fill ties

## Phase 4: Port bucket 1 to Go (R5) · `main`

- [x] **4.1** `internal/rules/match` and `internal/rules/courts`, following the determinism checklist, registered as version 1 (B-22)
- [x] **4.2** `internal/rules/roster` and `internal/rules/courtfill`
- [x] **4.3** Go case tests run in the gate before merge

## Phase 5: WebAssembly build and wrapper (R6) · `main`

- [x] **5.1** `cmd/ruleswasm` exports the bucket 1 rules
- [x] **5.2** `packages/rules-wasm`: the build and a typed wrapper with today's names and signatures; expose one batched court-fill call (per-match `canPlace` calls cost 62 ms vs the 5 ms mark)
- [x] **5.3** Every bucket 1 case passes through the wrapper in Vitest
- [x] **5.4** Loader for browser, server (Node), Vitest and Storybook; panic recovery and restart; `wasm_exec.js` pinned
- [x] **5.5** `tygo` types generated and checked in CI (B-23); tygo v0.2.21 pinned in the Makefile, owner approved 2026-11-16
- [x] **5.6** Fingerprint of the Go rule files checked in `make check`; `rules-manifest.json` published with the apps
- [x] **5.7** `packages/rules-wasm/` added to the backend CI paths and frontend CI's `paths-ignore`, like `packages/rule-cases/`

## Phase 6: Swap (R7) · `go-stack`

- [ ] **6.1** `packages/data` imports the wrapper; WebAssembly loads at app start, in the mock store and the Vitest setup
- [ ] **6.2** Delete each TypeScript bucket 1 rule once its cases pass on both; `packages/db` switched to the wrapper
- [ ] **6.4** "Rules ready" step before session screens draw; fixtures compute when first used
- [ ] **6.5** Public session page reads standings and wait times from the API, loads no `.wasm`
- [ ] **6.6** Session download fetches the latest `.wasm` if it lacks the session's version
- [ ] **6.3** `.wasm` cached like the app's JavaScript; offline click-through (tab open) in the beta project, recorded

## Phase 7: Verify

- [ ] **7.1** Case counts per rule before/after, recorded below
- [ ] **7.2** `make check` passes; PR lists what was verified

## Spike results

| Check | Pass mark | Standard Go | TinyGo |
|---|---|---|---|
| Compressed `.wasm` size | under 1.5 MB | Pass: raw 2.67 MB, gzip 0.76 MB, brotli 0.57 MB (host must compress `.wasm`) | not run |
| First load, mid-range Android | under 300 ms | Not measured (Node: 38 ms) | not run |
| 12-court fill, JSON in/out | under 5 ms | Pass as one batched call (median 0.84 ms); fails as 120 per-match calls (62 ms), so expose a batched fill | not run |
| Runs under Node (Vitest) | yes | Pass in plain Node; Vitest not run | not run |
| Mock mode in Queue app | yes | Not measured | not run |
| Cache and offline with tab open | yes | Not measured | not run |
| Rebuilds identically; Vercel serves it | yes | Not measured | not run |
| Vercel cold start added | under 200 ms | Not measured | not run |

Go 1.22.0 locally (re-check the pinned version: `wasm_exec.js` path and size); spike was in the scratchpad, not the repo. TinyGo not needed on current evidence. Owner said go on 2026-11-15 (standard Go). Phone, browser, Vercel rows still unmeasured (1.2 stays open).

## Case counts

| Rule group | Vitest `it` before | JSON after |
|---|---|---|
| match: standings and credit | match.rules 30 (shared) | computeStandings 18, countsFor 12, creditedPlayers 4, isPartial 3, others 3 |
| match: guards | | canPlace 5, canStart 9, canMoveCourt 6, canReplacePlayer 7, canSendBack 3, swapTarget 5, validateResult 14, completeLineup 8, courtsNeeded 6, holdsCourt 5, other 8 |
| match: counts and waits | gamesAdjustment 13 | gamesPlayed 6, gamesAdjustmentOf 3, waitMinutes 13, queuedCount 2, gamesPlayedFor 2 |
| courtfill | autoFill 12 | autoFillPlacements 21, nextEligibleForCourt 12, nextMatchCandidates 18, courtFillModeOf 3, putOnCourt 3 |
| courts | courts 7 + sessionEnd 14 | freeCourts 7, courtOpen 5, openedEarly 6, isBookingEnded 5, sessionEndError 18, sessionEndCourtConflict 5 |
| roster | (store-level, stay) | inUnfinishedMatch 8, slotCapacity 2, openSlots 3 |

256 JSON cases in 41 files. One `it` became several single-call cases; counts don't map 1:1. Store-level tests
(`control`, `courtFill`, `presenceBatch`, `rosterBatch`) stay in Vitest for go-writes-queue command cases.

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
| 2026-11-13 | all | Narrowed from "every server-enforced rule" to the rules the offline command registry runs; added command-case shape and gap cases | Go-only rules don't need a second copy kept in sync; the shared ones were missing RNG, clock and command parity | Spec refined |
| 2026-11-13 | 3.5 | Payments removed from shared cases | Owner: money is Go only | Ported in go-writes-queue R3; offline amount shown as last synced (mockup change first) |
| 2026-11-13 | 2.1–2.3 | Generation, Auto Queue and `seededRng` cases dropped from shared | Owner (Q3): device sends lineups, server checks them | Generation stays device-only; contract change ticketed in go-writes-queue |
| 2026-11-14 | all | Bucket 1 goes from two copies to one Go copy built to WebAssembly; spike, port, build and swap phases added | Two copies drift on sorting, rounding, time zones and null handling in ways cases miss | D-2026-11-14-01; fallback to two copies with guards if the spike fails |
| 2026-11-14 | 2.1, 4.1, 5.1 | Cases and rules versioned per Queue Session | Owner (B-22): device and server run the session's rules version | Registry and `v<n>` case folders; stamping and replay in go-writes-queue |
| 2026-11-14 | 5.4–5.5, 6.2–6.6 | Wiring gaps G8–G12 added | Code check: rules run while screens render and on the server, `packages/db` imports them, panics stop the Go program, hand-written types drift, no service worker | Wiring section in the spec; B-23 for `tygo` |
| 2026-11-14 | 5.6–5.7 | Shipping gaps G13–G15 added | CI scope blocks Go + `.wasm` in one PR; separate deploys can stamp a version the live `.wasm` lacks; the `.wasm` check was advisory | Manifest-based stamping (no maintenance mode), fingerprint in `make check`, CI paths |
| 2026-11-15 | all | One branch `chore/rule-cases` for all phases; spike run in scratchpad | Owner instruction | Phases 4-6 blocked until go-api-foundation exists |
| 2026-11-15 | 2.2 | Shapes defined in zod v4 (`@rotra/schema/rule-cases`), JSON Schema emitted; no ajv | No new dependencies | Rule cases gain optional top-level `now` |
| 2026-11-15 | 3.5 | No waitlist fill order / give slot / duplicate cases | No pure function exists; logic is inline in store mutations | Extract in the Go port or go-writes-queue |
| 2026-11-15 | 3.6 | `computeStandings` uses `localeCompare` with no locale | Machine-dependent; cases generated under en_US | Owner: pin locale before swap; Go must match en-US collation |
| 2026-11-15 | 3.x | JSON and Vitest switch in one commit | Owner: one branch | Separate-PR rule waived |
| 2026-11-15 | 1.1 | TinyGo 0.44.0 compared after all (owner asked) | Spike on the real `cmd/ruleswasm`, Node only | Both pass 264/264 tests. Raw: std 4.81 MB, TinyGo 1.25 MB. Gzip: 1.31 vs 0.45 MB. Brotli: 0.96 vs 0.32 MB. Node load: 40 vs 26 ms. 12-court-sized fill call median: 0.27 vs 0.33 ms. TinyGo needs Binaryen `wasm-opt` (asyncify) and its own `wasm_exec.js`. Standard Go kept (B-21: passes every mark); TinyGo is the fallback if size or phone load becomes a problem |
| 2026-11-15 | 4.1 | First runner rule is `courtsNeeded`, not money parsing | Money is Go only and has no JSON cases | Also first piece of 4.1 |
| 2026-11-15 | 4.1 | Name order uses a hand-made en-US collation subset (`internal/rules/collate`), not ICU | No `golang.org/x/text` approved | Matches every committed case; differs on ß/æ, Greek, Cyrillic, symbols, stacked marks. Owner accepted the subset on 2026-11-15 |
| 2026-11-15 | 5.1 | Wasm is 4.8 MB raw, 1.30 MB gzip (spike 0.76 MB) | `encoding/json` weight on Go 1.27.4 | Under 1.5 MB mark with ~0.2 MB spare; brotli or tuning before bucket 2 |
| 2026-11-15 | 5.2 | `putOnCourt` returns a copy; `FORMAT_TEAM_SIZES` is `formatTeamSizes()`; `now` defaults in wrapper | JSON boundary | Handle in the phase 6 swap |
| 2026-11-16 | 5.5 | `tygo` approved by owner and added as a dev tool (not in go.mod) | B-23 | Done; `Opt` maps to `key?: T \| null` |
| 2026-11-15 | 6.x | Phase 6 not done here | Swap belongs on `go-stack` | Needs that branch |
| 2026-11-16 | all | Go lowered from 1.27.4 to 1.26.11; wasm 3.79 MB raw, 1.03 MB gzip, 0.78 MB brotli; build now `-buildvcs=false` | `golangci-lint-action` may not accept a 1.27 module; rebuilds differed by git state | Rebuilds byte-identical |
