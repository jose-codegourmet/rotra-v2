# Plan: Shared rule-cases package

**Track ID:** rule-cases_20261113 · **Spec:** [spec.md](./spec.md)

Each phase becomes one ticket (or a few) under the Go API epic; link them here.

## Phase 1: Package

Ticket: needed

- [x] **1.1** Create `packages/rule-cases` with `exports` and the case JSON Schema
- [x] **1.2** Add a Vitest check that every case file matches the schema

## Phase 2: Move cases (no behavior change)

JSON files land in the backend PR; the Vitest switch is a separate frontend PR (see spec).

Ticket: needed

- [x] **2.1** Session cost and payments
- [x] **2.2** Match, auto-queue and auto-fill rules
- [x] **2.3** Session result and ranking settings
- [x] **2.4** License and club rules
- [x] **2.5** Money, phone and court-window parsing (`@rotra/schema`)

## Phase 3: Verify

Ticket: needed

- [x] **3.1** Compare case counts before/after; record them in the plan (below)
- [~] **3.2** `make check` passes; PR lists what was verified (run on the Vitest-runner branch, which holds both PRs' content)

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

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
| 2026-11-13 | 1.2 | Shape check uses `node:test`, not Vitest | A Vitest or Ajv devDependency would change `pnpm-lock.yaml`, which backend CI's `scope` job rejects | `packages/rule-cases/check-cases.test.mjs`, no dependencies |
| 2026-11-13 | 2.x | Cases were extracted by a recorder, not retyped; assertions on derived values (`.map`, `.length`, `toHaveLength`, mutation checks, `.not`) stay in TypeScript | Those are not input to expected pairs of one rule call | Left in the existing `*.rules.test.ts`; counted above |
| 2026-11-13 | 2.x | `expected` is a deep subset of the result (and `input.select` picks a path) | Matches `toMatchObject` and `.result`-style assertions exactly; for `toEqual` it no longer flags extra keys in the result | Written into `case.schema.json`; Go runner must use the same comparison |
| 2026-11-13 | 2.4 | `license/manila-today` dropped | Its inputs are `Date` objects, which JSON can't carry faithfully | Stays in `license.rules.test.ts` |
| 2026-11-13 | 2.5 | `court-window` not moved | Its tests build `Date` values in the machine's local time zone, so the cases would differ by machine; the zone rule needs an owner decision | Stays in `court-window.test.ts`; ask the owner before encoding a time zone |
| 2026-11-13 | 2.x | Original assertions not yet deleted from the moved test files | Deleting by hand risks changing what is tested; the runner proves the JSON matches the rules first | Frontend PR can delete the duplicated assertions once the owner agrees; nothing changed in them |
| 2026-11-13 | 1.1 | Runner reads JSON by path, not through an `@rotra/rule-cases` dependency | Same lockfile reason, and the Go tests read by repo path too | None needed |
