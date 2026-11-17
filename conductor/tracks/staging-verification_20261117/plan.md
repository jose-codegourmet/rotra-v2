# Plan: Staging verification: live checks and load test

**Track ID:** staging-verification_20261117 · **Spec:** [spec.md](./spec.md)

Ticket: none yet (one issue for the whole track, under epic #869).

## Phase 1: Beta project and data

- [ ] **1.1** Create the `go-stack` branch (BL-5), the Vercel project, env vars and domains (stop and ask: infrastructure)
- [ ] **1.2** Copy Supabase → Railway staging, compare counts, rehearse the account import (stop and ask: data copy)
- [ ] **1.3** No Supabase variables on beta; Railway default domain test

## Phase 2: Vercel-only behavior

- [ ] **2.1** Client IP, sign-in across subdomains, Go-down error, latency

## Phase 3: Live streams

- [ ] **3.1** Hour-long stream and event latency on staging
- [ ] **3.2** Deploy with screens open: `/readyz`, reconnect spread, catch-up

## Phase 4: Monitoring live

- [ ] **4.1** Metrics on Grafana Cloud for staging
- [ ] **4.2** Fire and resolve each alert once; record results

## Phase 5: Load test

- [ ] **5.1** `apps/api/cmd/loadtest` (TDD for its pieces)
- [ ] **5.2** One-hour run on staging with a deploy midway; results recorded

## Findings

| Issue | What | Blocker? | Status |
|---|---|---|---|

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
