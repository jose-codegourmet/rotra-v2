# Plan: Shared queue rules (one Go copy, run on the device as WebAssembly)

**Track ID:** rule-cases_20261113 · **Spec:** [spec.md](./spec.md)

Each phase becomes one ticket (or a few) under the Go API epic; link them here. Only **bucket 1**
(shared) rules get JSON cases and a WebAssembly build; see the spec for buckets 2 and 3. Phases 2–3
need nothing; phases 4–6 need go-api-foundation's Go module. If the spike fails, phases 5–6 are
replaced by the [fallback](./spec.md#fallback-if-the-spike-fails).

## Phase 1: Spike (R0, throwaway branch `spike/rules-wasm`)

Ticket: needed

- [ ] **1.1** Build `canPlace`, `waitMinutes`, `courtOpen` to WebAssembly with standard Go and with TinyGo, behind a wrapper
- [ ] **1.2** Measure size, phone load time, court-fill call cost, Vitest, mock mode, offline load, Vercel build
- [ ] **1.3** Record results below; pick the tool by the B-21 rule; owner asked only if both tools fail (pass marks confirmed 2026-11-14, size 1.5 MB)

## Phase 2: Cases package and shapes (R1, R2) · `main`

Ticket: needed

- [ ] **2.1** Create `packages/rule-cases` with `exports` and no barrel; cases under `v1/` (B-22)
- [ ] **2.2** JSON Schema for rule cases and command cases (`now` where a rule reads the clock)
- [ ] **2.3** Vitest check that every case file matches the schema

## Phase 3: Bucket 1 cases, no behavior change (R3, R4) · `main`

JSON files and the Vitest switch go in separate PRs (see spec).

Ticket: needed

- [ ] **3.1** Match guards: `canPlace` / `canStart` / `canMoveCourt` / `canReplacePlayer`, `swapTarget`, `validateResult`, team sizes
- [ ] **3.2** Game counts: counted games, substitution credit, games adjustment, `waitMinutes`, standings
- [ ] **3.3** Court fill: `autoFillPlacements`, `nextEligibleForCourt`, `nextMatchCandidates` (new), `putOnCourt`
- [ ] **3.4** Courts and time: court open / early / booking ended, session end and court conflict
- [ ] **3.5** Roster: step-down guard, duplicate, slots, waitlist fill order and give slot (new)
- [ ] **3.6** Language-edge cases (new): standings ties with accented and mixed-case names, rounding edges, court-fill ties

## Phase 4: Port bucket 1 to Go (R5) · `main`

Ticket: needed

- [ ] **4.1** `internal/rules/match` and `internal/rules/courts`, following the determinism checklist, registered as version 1 (B-22)
- [ ] **4.2** `internal/rules/roster` and `internal/rules/courtfill`
- [ ] **4.3** Go case tests run in the gate before merge

## Phase 5: WebAssembly build and wrapper (R6) · `main`

Ticket: needed

- [ ] **5.1** `cmd/ruleswasm` exports the bucket 1 rules
- [ ] **5.2** `packages/rules-wasm`: the build and a typed wrapper with today's names and signatures
- [ ] **5.3** Every bucket 1 case passes through the wrapper in Vitest
- [ ] **5.4** Loader for browser, server (Node), Vitest and Storybook; panic recovery and restart; `wasm_exec.js` pinned
- [ ] **5.5** `tygo` types generated and checked in CI (B-23)
- [ ] **5.6** Fingerprint of the Go rule files checked in `make check`; `rules-manifest.json` published with the apps
- [ ] **5.7** `packages/rules-wasm/` added to the backend CI paths and frontend CI's `paths-ignore`, like `packages/rule-cases/`

## Phase 6: Swap (R7) · `go-stack`

Ticket: needed

- [ ] **6.1** `packages/data` imports the wrapper; WebAssembly loads at app start, in the mock store and the Vitest setup
- [ ] **6.2** Delete each TypeScript bucket 1 rule once its cases pass on both; `packages/db` switched to the wrapper
- [ ] **6.4** "Rules ready" step before session screens draw; fixtures compute when first used
- [ ] **6.5** Public session page reads standings and wait times from the API, loads no `.wasm`
- [ ] **6.6** Session download fetches the latest `.wasm` if it lacks the session's version
- [ ] **6.3** `.wasm` cached like the app's JavaScript; offline click-through (tab open) in the beta project, recorded

## Phase 7: Verify

Ticket: needed

- [ ] **7.1** Case counts per rule before/after, recorded below
- [ ] **7.2** `make check` passes; PR lists what was verified

## Spike results

| Check | Pass mark | Standard Go | TinyGo |
|---|---|---|---|

## Case counts

| Rule | Vitest before | JSON after |
|---|---|---|

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
