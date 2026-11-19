# Track specification: Go API foundation

**Track ID:** go-api-foundation_20261113 · **Type:** feature · **Priority:** critical (order 2 of 14) · **Created:** 2026-11-13
**Depends on:** rule-cases phases 1–3 (spike result, case runner) · **Decisions:** B-01, B-02, B-03, B-16, B-17, B-21, B-34, D-2026-11-14-01 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

Everything later needs a running Go service with the same error and JSON contracts as today, tests against real Postgres, tracing to Grafana, and a Railway staging environment defined as code.

## Requirements

### R1: Spike: tools

Pick and pin the Go version, router, and query tool (`pgx` + a generator such as sqlc) after checking they read the Prisma schema in `packages/db/prisma/schema/*` and its migrations. Each library is a dependency decision.

**Accepted when:**

- [ ] Spike notes in the plan with a go/no-go per tool
- [ ] Owner approves the library list

### R2: Service skeleton

`apps/api` with config from env (fail fast), structured logs with request ids, `/healthz` and `/readyz`, graceful shutdown. Per [B-44](../../../docs/backend/open-decisions.md#settled): on SIGTERM, `/readyz` fails, writes in progress finish and background loops stop within the 30-second draining time (`RAILWAY_DEPLOYMENT_DRAINING_SECONDS=30` in `.railway/railway.ts`).

**Accepted when:**

- [ ] `/readyz` fails when Postgres is down
- [ ] On SIGTERM, a write in progress completes and the process exits before 30 seconds

### R3: Contracts

Errors and serialization match `@rotra/db/service/{errors,serialize}` exactly (codes, messages, bigint as decimal strings, dates). From then on ([B-45](../../../docs/backend/open-decisions.md#settled)): adding fields or routes is free; a rename or removal keeps the old one for one more release.

**Accepted when:**

- [ ] Golden tests compare Go output with captured Route Handler output for each error kind
- [ ] Changing an existing field in a golden response fails the test until the golden file is updated on purpose

### R4: Rule-case runner

Go test helper that loads `@rotra/rule-cases` files by path and runs a Go rule against them. Also create the empty `internal/rules` tree laid out in the [rule map](../rule-cases_20261113/spec.md#where-the-rules-live). The bucket 1 rules, `cmd/ruleswasm` and `packages/rules-wasm` are added by the rule-cases track (R5, R6), not here.

**Accepted when:**

- [ ] Runner proven on one simple rule (e.g. money parsing)

### R5: Tracing

OpenTelemetry traces to Grafana Cloud, service name `rotra-api`, trace context joined from the apps.

**Accepted when:**

- [ ] Traces visible in the local `otel-lgtm` stack

### R6: Railway as code

`.railway/railway.ts` with `api`, Postgres (Singapore) and environments `staging` / `production`; `railway` added as a root dev dependency; apply workflow manual from `main`.

**Accepted when:**

- [ ] `railway config plan` shows only intended resources
- [ ] Staging `/readyz` green on `api-beta.rotra.club`
- [ ] Railway default domain test (B-30): moved to staging-verification R1, since it needs the beta apps
- [ ] Watch paths and Wait for CI turned on for `api`
- [ ] `pg_stat_statements` enabled

### R7: Secret scanning (B-39)

Three layers per [B-39](../../../docs/backend/open-decisions.md#settled), before the signing key (B-27) exists anywhere:

- GitHub push protection turned on for the repo (owner, in repo Settings › Code security; needs admin rights).
- `.husky/pre-commit` runs `gitleaks git --pre-commit --staged`; it stops with install instructions when gitleaks is missing. Staged files only; the disabled workspace lint stays disabled.
- `.github/workflows/secrets.yml` runs gitleaks (pinned version) on every PR and push.
- Local development generates a throwaway signing key on setup; its file is git-ignored.

**Accepted when:**

- [ ] A test commit with a fake private key is refused by the hook, by CI and by push protection
- [ ] A normal commit is not slowed noticeably and passes all three
- [ ] The local key file is in `.gitignore`; setup steps documented

### R8: Required Backend CI (B-33)

Before the first Go code merges: a GitHub ruleset on `main` requires the Backend CI result; `backend.yml` runs on every PR, with a first job that checks the changed paths and Go jobs skipped when nothing backend changed ([B-33](../../../docs/backend/open-decisions.md#settled)). Frontend CI stays advisory. Recorded in the backend decisions only; AGENTS.md is not changed.

**Accepted when:**

- [ ] A Go PR with a failing test can't merge, and auto-merge waits for Backend CI
- [ ] A frontend-only PR merges without waiting on Go jobs (they show as skipped)
- [ ] A Go rule change with a stale `.wasm` can't merge
- [ ] Railway's Wait for CI still deploys a passing backend commit
- [ ] A PR changing a TypeScript shared rule and its cases together passes `scope` (B-37); one mixing `apps/api` with frontend files still fails
- [ ] The PR template has the shared-rule checklist line (B-37)

### R9: Housekeeping loop (B-34)

An hourly loop inside the API process ([B-34](../../../docs/backend/open-decisions.md#settled)): takes a Postgres advisory lock, runs each registered cleanup in batches of about 1,000 rows until none are left, logs and measures rows deleted. Retention values from env with the B-34 defaults. Tracks that add a growing table register its cleanup (go-sign-in: `auth_events`, `auth_sessions`; go-writes-queue: live-update events). No cron and no extra Railway service (B-07).

**Accepted when:**

- [ ] With two instances, only one runs a cleanup at a time
- [ ] A cleanup of many rows runs in batches and never blocks a normal write for long
- [ ] Shutdown stops the loop cleanly mid-batch

## Scope

**In:** The above.

**Out:** Any domain endpoint; Sign-in; Live updates.

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
