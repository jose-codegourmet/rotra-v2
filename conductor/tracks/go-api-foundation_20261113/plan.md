# Plan: Go API foundation

**Track ID:** go-api-foundation_20261113 · **Spec:** [spec.md](./spec.md)

Ticket: #871 (one issue for the whole track, under epic #869).

## Phase 1: Spike

- [x] **1.1** Go version, router and query tool chosen; Prisma schema readable
- [x] **1.2** Library list approved by the owner (stop and ask)

## Phase 2: Skeleton

- [x] **2.1** Config loader (test: missing env fails)
- [x] **2.2** Logger + request id (test: id echoed)
- [x] **2.3** `/healthz`, `/readyz` (test: DB down → not ready)
- [x] **2.4** Graceful shutdown (test: in-flight request finishes)
- [x] **2.5** Postgres pool + first generated query (test against a Postgres container)

## Phase 3: Contracts and rules

- [x] **3.1** Error contract golden tests
- [x] **3.2** Serialization golden tests (bigint, dates, nulls)
- [x] **3.3** Rule-case runner + first rule passing

## Phase 4: Tracing

- [x] **4.1** OTel setup (test: span exported to an in-memory exporter)

## Phase 5: Railway staging

- [ ] **5.1** `.railway/railway.ts` + `railway` dev dependency
- [ ] **5.2** Manual apply workflow
- [ ] **5.3** Apply to staging; watch paths, Wait for CI, `pg_stat_statements` on (stop and ask: infrastructure)
- [ ] **5.4** Backend CI green on `main`

## Phase 6: Added from spec R7–R9

- [~] **6.1** R7 secret scanning: hook and `secrets.yml` done; push protection is the owner's (repo Settings)
- [~] **6.2** R8 required Backend CI: `backend.yml` and PR template done; GitHub ruleset is the owner's
- [x] **6.3** R9 housekeeping loop (needs pgx approval)

## Spike notes (1.1)

Go 1.27.4 (supported, toolchain auto-download; `wasm_exec.js` now at `lib/wasm/`). `net/http` ServeMux: go. pgx v5: go.
sqlc v1.30.0: go (verified; 31 migrations parse, glob works, no file list needed). Tests: Actions
`services: postgres` + `DATABASE_URL_TEST` instead of testcontainers. Library list approved by owner 2026-11-15 (pgx v5, sqlc dev tool, OTel).

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
| 2026-11-15 | all | Stdlib-only work done first; 2.5, R5, R6, R9 wait for library approval and infra OK | Plan 1.2 and AGENTS #11 | Asked in one batch |
| 2026-11-15 | 2.3 | `/readyz` uses a TCP dial stand-in until pgx exists | No approved DB library yet | Replace in 2.5 |
| 2026-11-15 | 3.3 | First runner rule is `courtsNeeded`, not money parsing | Money has no JSON cases | Logged in rule-cases |
| 2026-11-15 | R7-R9 | Added tasks 6.1-6.3 | Plan covered R1-R6 only | |
| 2026-11-15 | 2.3 | TCP-dial stand-in replaced by pgxpool ping | pgx approved | Done in 2.5 |
| 2026-11-15 | 6.3 | No cleanup registered yet | Tables don't exist until go-sign-in / go-writes-queue | Use `housekeeping.OlderThanDays` |
| 2026-11-16 | 3.2 | `ToMoney` now errors past the JS safe-integer limit; Go lowered to 1.26.11 | Owner decisions | Done |
| 2026-11-16 | R8 | Ruleset (owner, GitHub admin) should require the `scope` job only; push protection skipped for now; Railway staging (5.x) skipped for now | Owner | |
