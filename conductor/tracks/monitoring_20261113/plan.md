# Plan: Monitoring: Grafana for API, Postgres and pictures

**Track ID:** monitoring_20261113 · **Spec:** [spec.md](./spec.md)

Each phase becomes one ticket (or a few) under the Go API epic; link them here.

## Phase 1: Alloy

Ticket: #798

- [ ] **1.1** Add `alloy` to `.railway/railway.ts` with its config
- [ ] **1.2** Postgres metrics in Grafana Cloud

## Phase 2: API metrics

Ticket: #799

- [ ] **2.1** Metric instruments (tests with an in-memory reader)
- [ ] **2.2** Dashboard in Grafana Cloud

## Phase 3: Alerts

Ticket: #800

- [ ] **3.1** Create the alert rules
- [ ] **3.2** Fire and resolve each once on staging; record results

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
