# Tracks — backend

Order is the priority order. Epic: #869; each track is one issue, linked in its plan.

**Branches (B-20).** Rule cases, the Go API (`apps/api`) and Railway changes merge into `main`. The shared queue rules' Go code and WebAssembly build also merge into `main`; nothing
there imports them until the swap (D-2026-11-14-01). UI changes
that need the Go API (swapping the device to the WebAssembly rules, screens calling Go, deleting TypeScript copies of Go-only rules, offline payments
amount, mock mode per area) branch from and merge into the long-lived `go-stack` branch, which the beta
Vercel project builds. `main` is merged into `go-stack` at least weekly; `go-stack` merges into `main` at ship. Status: `[ ]` pending · `[~]` in progress · `[x]` done.

| # | Status | Track | Type | Priority | Depends on | Phases / tasks |
|---|---|---|---|---|---|---|
| 1 | [~] | [rule-cases_20261113](./tracks/rule-cases_20261113/) — Shared queue rules: one Go copy, run on the device as WebAssembly (spike first) | chore | critical | — (phases 4–6: go-api-foundation) | 7 / 30 |
| 2 | [ ] | [go-api-foundation_20261113](./tracks/go-api-foundation_20261113/) — Go API foundation | feature | critical | rule-cases phases 1–3 (spike, case runner) | 5 / 15 |
| 3 | [ ] | [monitoring_20261113](./tracks/monitoring_20261113/) — Monitoring: Grafana for API, Postgres and pictures | chore | high | go-api-foundation | 3 / 6 |
| 4 | [ ] | [beta-stack_20261113](./tracks/beta-stack_20261113/) — Side-by-side beta stack | chore | high | go-api-foundation | 4 / 8 |
| 5 | [ ] | [go-public-reads_20261113](./tracks/go-public-reads_20261113/) — Public reads in Go | refactor | high | beta-stack | 3 / 7 |
| 6 | [ ] | [go-sign-in_20261113](./tracks/go-sign-in_20261113/) — Sign-in owned by Go | feature | critical | beta-stack | 5 / 15 |
| 7 | [ ] | [go-signed-in-reads_20261113](./tracks/go-signed-in-reads_20261113/) — Signed-in reads in Go | refactor | high | go-sign-in, go-public-reads | 4 / 6 |
| 8 | [ ] | [go-writes-admin-player_20261113](./tracks/go-writes-admin-player_20261113/) — Admin and Player writes in Go | refactor | high | go-signed-in-reads | 3 / 4 |
| 9 | [ ] | [go-writes-queue_20261113](./tracks/go-writes-queue_20261113/) — Queue writes and offline contract in Go | refactor | critical | go-writes-admin-player | 5 / 9 |
| 10 | [ ] | [live-updates_20261113](./tracks/live-updates_20261113/) — Live updates | feature | high | go-writes-queue (events), beta-stack (ticket route, B-41) | 2 / 5 |
| 11 | [ ] | [pictures-buckets_20261113](./tracks/pictures-buckets_20261113/) — Pictures on Cloudflare R2 (Railway Buckets as the fallback, B-31) | refactor | medium | go-writes-admin-player | 3 / 4 |
| 12 | [ ] | [ship-and-retire_20261113](./tracks/ship-and-retire_20261113/) — Ship the Go stack and retire Supabase | chore | medium | all earlier tracks | 3 / 7 |

## Backlog

Open items set aside on 2026-11-13. Not scheduled; each says when it must be picked up at the latest.

| ID | Item | Comes from | Pick up before |
|---|---|---|---|
| BL-1 | What mock mode does per area once its TypeScript rules are deleted (fixture answers or no mock mode) | [D-2026-11-13-08](../docs/mvp/decisions.md#d-2026-11-13-08) | deleting that area's TypeScript copies on `go-stack` |
| BL-2 | Grace period and exact schedule checks for offline device time (owner OK) | [rule-cases Q2](./tracks/rule-cases_20261113/spec.md#owner-answers-2026-11-13), go-writes-queue R1a | go-writes-queue R1a |
| BL-3 | Ticket for the lineup contract change (device sends lineups instead of `n`) | rule-cases Q3, go-writes-queue R1a | go-writes-queue R1a |
| BL-4 | Mockup change: offline payments show the last synced amount due | rule-cases payments, go-writes-queue R3 | go-writes-queue R3 |
| BL-5 | Create the `go-stack` branch off `main` (B-20) | beta-stack R1 | beta-stack R1 |
| BL-6 | Service worker for the Queue app, so it and the rules `.wasm` load after an offline reload | [D-2026-11-14-01](../docs/mvp/decisions.md#d-2026-11-14-01), rule-cases G12 | real clubs relying on offline reloads |
| BL-7 | Mockup change: "Sign in to sync N waiting changes", the revoked-device message, the sign-out warning with waiting changes, and the revoke dialog's offline-copy warning | [B-28](../docs/backend/open-decisions.md#settled) | go-sign-in R3 |
| BL-8 | Mockup change + ticket: read-only switch for the cutover (one setting; writes refused with a "ROTRA is updating" message) | [B-35](../docs/backend/open-decisions.md#settled) | ship-and-retire R2 |
| BL-9 | Backups and a restore drill: confirm what Railway Hobby includes, production schedule (suggested daily + weekly; point-in-time recovery after pricing), a timed restore drill on staging, a manual off-Railway `pg_dump` before ship and risky migrations | [B-40](../docs/backend/open-decisions.md#will-hurt-later) | ship-and-retire R1 |

`monitoring` and `beta-stack` can run in parallel after the foundation; `go-public-reads` and `go-sign-in` can run in parallel after `beta-stack`.

**Beta sign-in (B-24).** The beta Vercel project never holds Supabase keys, so it has no sign-in until `go-sign-in` lands; before that it serves only public pages and reads, and real users don't get the beta domains.
