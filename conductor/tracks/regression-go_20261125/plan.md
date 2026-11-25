# Plan: Regression suite on the Go API and plain Postgres

**Track ID:** regression-go_20261125 · **Spec:** [spec.md](./spec.md)

Ticket: #1097 (one issue for the whole track, under epic #869).

Order of work: get one test through the whole new stack first (Phase 2, no clock), then add the clock (Phase 3), then run everything (Phase 4). The stack is the biggest unknown, so it comes before the clock.

## Phase 1: Audit (read only)

- [x] **1.0** Owner confirmed the answers to Q1 to Q3 in the [spec](./spec.md#questions-and-answers-confirmed-by-the-owner-2026-11-25) (2026-11-25)
- [x] **1.1** API paths: every `/api` path the `sim` and `ui` code calls has a Go route (2026-11-25, compared by path against the 215 routes Go registers; list in the spec)
- [ ] **1.2** Pages: list the pages the `ui` tests open and the server-side reads behind them; mark any that need a route or a sign-in check Go does not give
- [ ] **1.3** Apply the Prisma migrations on a plain `postgres:16-alpine` and write down what Supabase provided (stub roles as in `testpg.ApplyMigrations`, the `auth.users` bridge)
- [x] **1.4** Baseline recorded: GitHub run 45510221179 (table below)

## Phase 2: One test through the new stack (no clock yet)

- [ ] **2.1** Rewrite `src/guard.ts`: only the local throwaway Postgres, no Supabase URL, no override
- [ ] **2.2** `prepare.ts`: start or reuse the throwaway Postgres container, rebuild and migrate the database; no Supabase CLI
- [ ] **2.3** Seed the admin, club and player accounts as Q3 says; `api/sign-in.ts` and `ui/sign-in.ts` keep their contract
- [ ] **2.4** `stack.ts` and `playwright.config.ts`: build the Go API once and start it as a fourth server, ready when `/readyz` answers; give the apps `ROTRA_GO_API_URL`, the local proxy secret and the moved areas from Q1; remove every Supabase variable
- [ ] **2.5** The Go API's log is attached to every failed test, with the request id of the failing call
- [ ] **2.6** The smoke test and the checks that never move the clock pass through Go

## Phase 3: Test-only clock in the Go API (strict TDD)

- [ ] **3.1** Failing tests: off without the e2e variable; refuses to start unless `DATABASE_URL` is the local throwaway database; set and reset over the control endpoint; never earlier than real time
- [ ] **3.2** Implement the clock and wire it into every Go package that takes a clock or reads `time.Now` on a request path (list them first; a nil clock falls back to real time), sign-in included (Q2)
- [ ] **3.3** List the Go queries that read SQL `now()` for session time and handle each one
- [ ] **3.4** `clock.ts` sets the Go clock together with the three apps; the simulation client refreshes once on 401 `expired` and retries, as the real apps do
- [ ] **3.5** REG-01 passes through Go

## Phase 4: Scenarios through Go

- [ ] **4.1** Run every `sim` scenario. A difference in behavior is a `bug` issue under #869 and the test is marked with `knownDefect`. A route that is missing in Go is a backlog item, not a bug, and the test is skipped with that item's id
- [ ] **4.2** Run the `ui` tests the same way
- [ ] **4.3** Delete the Supabase leftovers in `apps/e2e` (`seed/auth-admin.ts`, the `auth.users` bridge, unused keys)

## Phase 5: CI and docs

- [ ] **5.1** Regression workflow: set up Go (with its build cache) and a Postgres service, drop the Supabase CLI, upload the Go log with the report; record one run and its duration here
- [ ] **5.2** Update `docs/regression.md`, the `apps/e2e` lines in `AGENTS.md`, the `Makefile` comments and `e2e-down`; add the decision entry that replaces the local-Supabase part of D-2026-11-12-05
- [ ] **5.3** `make check` on the last commit

## Baseline (last TypeScript run)

| Test | Result on 2026-11-24 | Through Go |
|---|---|---|
| REG-08 | P14 at 7 games against 8; spread 3 (seed 3505436714) | |
| REG-33 | claim link status `valid`, test expects `active` | |
| UI-01 | Admin Clubs table never shows the seeded club | |
| UI-08, UI-12, UI-17 | Start session never reaches the live session console | |

## Findings

| Date | Scenario | Finding | Issue |
|---|---|---|---|

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
