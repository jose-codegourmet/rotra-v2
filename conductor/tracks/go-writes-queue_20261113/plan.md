# Plan: Queue writes and offline contract in Go

**Track ID:** go-writes-queue_20261113 · **Spec:** [spec.md](./spec.md)

Ticket: #878 (one issue for the whole track, under epic #869).

## Phase 1: Contract

- [ ] **1.1** Characterize `operationId`, revisions and 409s
- [ ] **1.2** Sync read/write and roster batch

## Phase 2: Commands

- [ ] **2.1** Preparation and roster
- [ ] **2.2** Join and match requests
- [ ] **2.3** Match control and Generate matches add
- [ ] **2.4** Results, finalization, cancel/delete

## Phase 3: Money

- [ ] **3.1** Cost, payments, inventory (stop and ask)

## Phase 4: Events

- [ ] **4.1** Outbox event append in each write transaction

## Phase 5: Switch

- [ ] **5.1** Extend the beta rewrite list; replay a recorded offline session on beta

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
