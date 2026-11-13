# Track specification: Go API foundation

**Track ID:** go-api-foundation_20261113 · **Type:** feature · **Priority:** critical (order 2 of 12) · **Created:** 2026-11-13
**Depends on:** rule-cases (for the case runner) · **Decisions:** B-01, B-02, B-03, B-16, B-17 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

Everything later needs a running Go service with the same error and JSON contracts as today, tests against real Postgres, tracing to Grafana, and a Railway staging environment defined as code.

## Requirements

### R1: Spike: tools

Pick and pin the Go version, router, and query tool (`pgx` + a generator such as sqlc) after checking they read the Prisma schema in `packages/db/prisma/schema/*` and its migrations. Each library is a dependency decision.

**Accepted when:**

- [ ] Spike notes in the plan with a go/no-go per tool
- [ ] Owner approves the library list

### R2: Service skeleton

`apps/api` with config from env (fail fast), structured logs with request ids, `/healthz` and `/readyz`, graceful shutdown.

**Accepted when:**

- [ ] `/readyz` fails when Postgres is down

### R3: Contracts

Errors and serialization match `@rotra/db/service/{errors,serialize}` exactly (codes, messages, bigint as decimal strings, dates).

**Accepted when:**

- [ ] Golden tests compare Go output with captured Route Handler output for each error kind

### R4: Rule-case runner

Go test helper that loads `@rotra/rule-cases` files by path and runs a Go rule against them.

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
- [ ] Watch paths and Wait for CI turned on for `api`
- [ ] `pg_stat_statements` enabled

## Scope

**In:** The above.

**Out:** Any domain endpoint; Sign-in; Live updates.

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
