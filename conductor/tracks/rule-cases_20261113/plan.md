# Plan: Shared rule-cases package

**Track ID:** rule-cases_20261113 · **Spec:** [spec.md](./spec.md)

Each phase becomes one ticket (or a few) under the Go API epic; link them here.

## Phase 1: Package

Ticket: needed

- [x] **1.1** Create `packages/rule-cases` with `exports` and the case JSON Schema
- [x] **1.2** Add a Vitest check that every case file matches the schema

## Phase 2: Move cases (no behavior change)

JSON files land in the backend PR; the Vitest switch is a separate frontend PR (see spec).

Ticket: needed

- [ ] **2.1** Session cost and payments
- [ ] **2.2** Match, auto-queue and auto-fill rules
- [ ] **2.3** Session result and ranking settings
- [ ] **2.4** License and club rules
- [ ] **2.5** Money, phone and court-window parsing (`@rotra/schema`)

## Phase 3: Verify

Ticket: needed

- [ ] **3.1** Compare case counts before/after; record them in the plan
- [ ] **3.2** `make check` passes; PR lists what was verified

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
