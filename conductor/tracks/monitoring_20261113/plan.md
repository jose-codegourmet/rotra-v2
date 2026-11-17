# Plan: Monitoring: Grafana for API, Postgres and pictures

**Track ID:** monitoring_20261113 · **Spec:** [spec.md](./spec.md)

Ticket: #872 (one issue for the whole track, under epic #869).

## Phase 1: Alloy

- [ ] **1.1** Add `alloy` to `.railway/railway.ts` with its config
- [ ] **1.2** Postgres metrics visible in the local stack

## Phase 2: API metrics

- [ ] **2.1** Metric instruments (tests with an in-memory reader)
- [ ] **2.2** Dashboard in Grafana Cloud

## Phase 3: Alerts

- [ ] **3.1** Create the alert rules
- [ ] **3.2** Rules load without errors (firing each on staging moved to staging-verification R4)

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
