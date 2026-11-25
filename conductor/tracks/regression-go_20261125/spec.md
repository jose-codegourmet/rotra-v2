# Track specification: Regression suite on the Go API and plain Postgres

**Track ID:** regression-go_20261125 · **Type:** chore · **Priority:** high (order 16 of 16, run before order 13) · **Created:** 2026-11-25
**Depends on:** go-writes-queue, go-sign-in-catch-up · **Blocks:** staging-verification (a local green run comes first) · **Guide:** [regression.md](../../../docs/regression.md)

## Why

The regression suite (`apps/e2e`) runs whole club nights through the three apps, but it never reaches the Go API. `e2eEnv` in `apps/e2e/src/stack.ts` sets no `ROTRA_GO_API_URL`, so every call goes to the TypeScript Route Handlers, Prisma and a local Supabase. A green run on `go-stack` says nothing about the Go routes. This track points the suite at the Go API on a throwaway local Postgres and removes Supabase from it.

## Owner answers (2026-11-25)

| Question | Answer |
|---|---|
| May the Go API get a test-only clock? | Yes, guarded: off unless an e2e variable is set, and it refuses to start unless the database is the local throwaway one |
| What happens to the Supabase + TypeScript mode? | Replaced. The suite runs only against Go and plain Postgres |

## Questions and answers (confirmed by the owner, 2026-11-25)

Suggested from the code and confirmed by the owner on 2026-11-25.

### Q1: Which areas does the suite forward to Go?

**Answer: all of `/api`, for the e2e run only.** It is the list staging-verification will use (B-60), so the suite tests the setup that ships.

- `/api/club` is unlistable for staging because of the logo upload (BL-11). In Go that stub answers only when the request body has `logoUrl` (`queuewrites/club_writes.go`, `updateClubSettings`). The suite's one `PATCH /api/club` sends `expectedRevision` and `selfCheckInEnabled`, and no scenario uploads a picture.
- Every `/api` path the suite calls has a Go route (plan 1.1).
- A route that exists only in TypeScript answers 404 from Go. That shows up as a finding, which is what a run before ship should do.
- The e2e list changes nothing on beta or production; B-60 stays as it is there.

### Q2: Does sign-in follow the test clock?

**Answer: yes, one clock for everything, and the simulation client refreshes like the real apps.**

- The three Node servers already run on the virtual clock, and they check the Go pass against it (`packages/api-proxy/src/pass.ts`). If Go signed passes on real time, a pass would look expired to Node and valid to Go after the first jump. Production never has two clocks, so that would cause failures only the tests can produce.
- The sign-in packages already take a clock, so no test hook goes into auth code. Only `cmd/api/main.go` passes the clock in.
- An access pass lives 15 minutes (B-27), so a 3-hour scenario expires it about 12 times. The simulation client gets what the apps have: on 401 `expired`, one refresh, one retry. This also puts refresh under test.
- Risks to check while building: the refresh limit (30 a minute per session) counts on the same virtual clock; a pass issued on virtual time is not valid yet after `resetClock`, so every test signs in again after a reset.

### Q3: How are the accounts seeded?

**Answer: the TypeScript seed writes the rows directly, as the Go tests do.**

- One `auth_identities` row per account (audience, login key, argon2id hash, scheme), and the account row's provider and subject pointed at it. `apps/api/internal/writetest/env.go` (`RelinkAdmins`, `RelinkClubs`, `RelinkPlayers`) is the pattern.
- The hash comes from Node's built-in `crypto.argon2` (in Node 24, checked), in the format Go reads: `$argon2id$v=19$m=…,t=…,p=…$salt$key`. No new dependency and no new Go command.
- Not chosen: the account import (`cmd/authimport`) reads from a Supabase database, which this track removes; seeding through the product's own routes still needs a first admin from somewhere and is slower.
- To check while building: that Go accepts the cheap test parameters, or which minimum it enforces.

## What is true today (checked 2026-11-25)

- Every `/api` path the suite calls has a Go route, compared by path against the 215 routes Go registers. The prefixes are `auth`, `claim`, `club`, `clubs`, `public-sessions`, `ranking-settings`, `register`, `sessions`, `venues`. Not checked yet: the pages the `ui` tests open (plan 1.2).
- Sign-in: the seed creates Supabase Auth users (`src/seed/auth-admin.ts`); Go signs in from its own tables (`auth_identities`, argon2id hashes in `internal/auth/password`).
- Clock: the scenarios move a virtual clock inside the three Node servers (`src/server-clock.mjs`). Go's queue writes accept an injected clock (`queuewrites.Deps.Now`), but `cmd/api/main.go` passes real time.
- Guard: `src/guard.ts` allows only Postgres on port 54322 and Supabase on `127.0.0.1:54321`.
- `prepare.ts` needs the Supabase CLI, which is not installed on the owner's Mac.
- `go test ./...` fails in one package: `internal/rules/sessionresult`, `TestSessionStandings` (position after a tie, part of [BL-20](../../tracks.md#backlog)). Results math; the owner decides.
- Last TypeScript run: [GitHub run 45510221179](https://github.com/jose-codegourmet/rotra-v2/actions/runs/45510221179) on `go-stack`, 2026-11-24: 45 passed, 6 failed (REG-08, REG-33, UI-01, UI-08, UI-12, UI-17), 1 skipped. Not diagnosed.

## Requirements

### R1: Audit before building

List what each scenario touches and whether Go answers it, what the Prisma migrations need on a plain Postgres, and how the accounts get into Go's sign-in tables.

**Accepted when:**

- [x] Every `/api` path and every page the scenarios open is listed per app, with "in Go" or "not in Go"; each "not in Go" names its backlog item or gets a new one (the only gap, trusted hosts and Session hosts, is BL-22; the earlier path comparison missed it)
- [x] The migrations apply on a plain Postgres, with the stub roles and anything else Supabase provided written down
- [x] The owner has confirmed the answers to Q1, Q2 and Q3 (2026-11-25)
- [x] The six failures of the last TypeScript run are recorded in the plan as the baseline

### R2: Test-only clock in the Go API

One virtual clock for the Go API, with the same rules as the Node one: never earlier than real time, set and reset over a control endpoint on `127.0.0.1`.

**Accepted when:**

- [x] Off by default: without the e2e variable the binary has no clock code path and no control endpoint
- [x] With the variable set, the API refuses to start unless `DATABASE_URL` is the local throwaway database
- [x] Every Go package that takes a clock or reads `time.Now` on a request path uses the test clock (a nil clock falls back to real time today, so each one is wired on purpose); Go SQL that reads `now()` for session time is listed and handled
- [x] Go tests cover all three points (strict TDD)

### R3: The stack runs on Go and plain Postgres

`make e2e` starts a throwaway Postgres, migrates and seeds it, starts the Go API and the three built apps, and forwards the moved areas to Go. No Supabase.

**Accepted when:**

- [x] The guard allows only the local throwaway Postgres and refuses everything else; there is no override
- [x] `prepare` needs Docker and Go, and no Supabase CLI
- [x] The apps run with `ROTRA_GO_API_URL`, a local test proxy secret and the moved-areas list from R1, and with no Supabase variable
- [x] The seeded admin, club and player accounts sign in through Go; the sign-in helpers keep their contract
- [x] `setClock`, `advanceClock` and `resetClock` move the Go clock together with the three apps
- [x] The Go API starts as a fourth server and counts as ready only when `/readyz` answers
- [x] A failed test carries the Go API's log and the request id of the failing call, since there is no TypeScript run left to compare against

### R4: The scenarios run through Go

**Accepted when:**

- [x] The smoke test and REG-01 pass through Go
- [x] Every `sim` scenario and every `ui` test has run; each one is green, or its difference is a GitHub issue labeled `bug` under epic #869 and the test is marked with `knownDefect`
- [x] A test that needs a route Go does not have is skipped with the backlog item's id, never marked as a known defect
- [x] No Supabase code is left in `apps/e2e` (`auth-admin.ts`, the `auth.users` bridge, the Supabase variables)

### R5: CI and docs

**Accepted when:**

- [ ] The Regression workflow sets up Go and Postgres, drops the Supabase CLI, and one run is recorded in the plan
- [ ] `docs/regression.md`, the `apps/e2e` lines in `AGENTS.md` and the `Makefile` comments say what is true
- [ ] A decision entry replaces the local-Supabase part of [D-2026-11-12-05](../../../docs/mvp/decisions/2026-11-12.md#d-2026-11-12-05)
- [ ] `make check` passes on the last commit

## Scope

In: `apps/e2e`, the test clock in `apps/api`, the Regression workflow, `docs/regression.md`, the lines in `AGENTS.md` and the `Makefile`. Out: fixing what the scenarios find (bugs are logged, not fixed here), porting routes that are not in Go yet, the standings numbering (BL-20), offline mode, new scenarios, staging and Railway.

## Constraints

- The clock is test-only and never reachable in production: guarded by the variable and the database check, bound to `127.0.0.1`.
- No test value is a real secret. The proxy secret, the signing key and the passwords are fixed local values, as the visitor receipt secret is today.
- A route that is not in Go has no sign-in to fall back on once Supabase is gone. Its scenarios wait for that route; they are not rewritten to avoid it.
- One branch off `go-stack`, one PR into `go-stack` for the whole track, Go and suite changes together (as live-updates did in #1095).
- No new dependency without a decision.
