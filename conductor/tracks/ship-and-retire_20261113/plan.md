# Plan: Ship the Go stack and retire Supabase

**Track ID:** ship-and-retire_20261113 · **Spec:** [spec.md](./spec.md)

Ticket: #881 (one issue for the whole track, under epic #869).

## Phase 1: Readiness

- [ ] **1.1** Regression suite against beta
- [ ] **1.2** Owner readiness sign-off (stop and ask)

## Phase 2: Ship

- [ ] **2.1** Final copy + import + domain switch (stop and ask: production)
- [ ] **2.2** Watch alerts for a week

## Phase 3: Retire

- [ ] **3.1** Remove Route Handlers and services
- [ ] **3.2** Regression suite on local Postgres + Go
- [ ] **3.3** Remove Supabase after sign-off; update docs

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
