# Track specification: Monitoring: Grafana for API, Postgres and pictures

**Track ID:** monitoring_20261113 · **Type:** chore · **Priority:** high (order 3 of 14) · **Created:** 2026-11-13
**Depends on:** go-api-foundation · **Decisions:** B-16, B-19 ([register](../../../docs/mvp/decisions/2026-11-13.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

We need to see errors, latency, database health and growth from day one of the beta, on the same Grafana Cloud stack as the apps.

**Testing during the move ([B-52](../../../docs/backend/open-decisions.md#settled)).** Until every area is in Go, checks run **locally**: the apps (`pnpm dev`) with `ROTRA_GO_API_URL` pointing at a local Go API, both on one local Postgres. No live environment, no database URL outside Railway. Live checks on Railway and Vercel run once, in [staging-verification](../staging-verification_20261117/spec.md), and what they find is logged as bugs. Here: dashboards and alert rules are built and checked against the local `otel-lgtm` stack; seeing them on Grafana Cloud for staging, and firing each alert, is staging-verification R4.

## Requirements

### R1: Alloy for Postgres

A Grafana Alloy service on Railway (private network) running the Postgres exporter, sending metrics to Grafana Cloud.

**Accepted when:**

- [ ] Alloy config added; connections, cache hit, sizes and `pg_stat_statements` top queries visible locally

### R2: API metrics

Request rate, errors, latency, DB pool, open live connections, sign-in and rate-limit counters, picture upload/delete bytes.

**Accepted when:**

- [ ] Metrics visible for a local API in the local stack
- [ ] Deploy-timing panel ([B-26](../../../docs/backend/open-decisions.md#settled)): Queue Sessions running, open live-update streams and request rate, now and by hour of the week

### R3: Alerts

The starting thresholds in [observability](../../../docs/observability.md#planned-go-api-postgres-and-pictures-on-railway).

**Accepted when:**

- [ ] Alert rules created with the starting thresholds (firing each once on staging: staging-verification R4)

## Scope

**In:** Alloy service, API metrics, dashboards, alerts.

**Out:** Frontend metrics; Railway-internal metrics export (not offered).

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
