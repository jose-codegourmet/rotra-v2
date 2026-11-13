# Plan: Go API foundation

**Track ID:** go-api-foundation_20261113 · **Spec:** [spec.md](./spec.md)

Each phase becomes one ticket (or a few) under the Go API epic; link them here.

## Phase 1: Spike

Ticket: #793

- [ ] **1.1** Go version, router and query tool chosen; Prisma schema readable
- [ ] **1.2** Library list approved by the owner (stop and ask)

## Phase 2: Skeleton

Ticket: #794

- [ ] **2.1** Config loader (test: missing env fails)
- [ ] **2.2** Logger + request id (test: id echoed)
- [ ] **2.3** `/healthz`, `/readyz` (test: DB down → not ready)
- [ ] **2.4** Graceful shutdown (test: in-flight request finishes)
- [ ] **2.5** Postgres pool + first generated query (test against a Postgres container)

## Phase 3: Contracts and rules

Ticket: #795

- [ ] **3.1** Error contract golden tests
- [ ] **3.2** Serialization golden tests (bigint, dates, nulls)
- [ ] **3.3** Rule-case runner + first rule passing

## Phase 4: Tracing

Ticket: #796

- [ ] **4.1** OTel setup (test: span exported to an in-memory exporter)

## Phase 5: Railway staging

Ticket: #797

- [ ] **5.1** `.railway/railway.ts` + `railway` dev dependency
- [ ] **5.2** Manual apply workflow
- [ ] **5.3** Apply to staging; watch paths, Wait for CI, `pg_stat_statements` on (stop and ask: infrastructure)
- [ ] **5.4** Backend CI green on `main`

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
