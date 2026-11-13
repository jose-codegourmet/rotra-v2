# Track specification: Monitoring: Grafana for API, Postgres and pictures

**Track ID:** monitoring_20261113 · **Type:** chore · **Priority:** high (order 3 of 12) · **Created:** 2026-11-13
**Depends on:** go-api-foundation · **Decisions:** B-16, B-19 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

We need to see errors, latency, database health and growth from day one of the beta, on the same Grafana Cloud stack as the apps.

## Requirements

### R1: Alloy for Postgres

A Grafana Alloy service on Railway (private network) running the Postgres exporter, sending metrics to Grafana Cloud.

**Accepted when:**

- [ ] Connections, cache hit, sizes and `pg_stat_statements` top queries visible

### R2: API metrics

Request rate, errors, latency, DB pool, open live connections, sign-in and rate-limit counters, picture upload/delete bytes.

**Accepted when:**

- [ ] Metrics visible for the staging API

### R3: Alerts

The starting thresholds in [observability](../../../docs/observability.md#planned-go-api-postgres-and-pictures-on-railway).

**Accepted when:**

- [ ] Each alert fires once in a staged test and resolves

## Scope

**In:** Alloy service, API metrics, dashboards, alerts.

**Out:** Frontend metrics; Railway-internal metrics export (not offered).

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
