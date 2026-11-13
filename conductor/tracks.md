# Tracks — backend

Order is the priority order. Epic: #788; each plan links its tickets. Status: `[ ]` pending · `[~]` in progress · `[x]` done.

| # | Status | Track | Type | Priority | Depends on | Phases / tasks |
|---|---|---|---|---|---|---|
| 1 | [x] | [rule-cases_20261113](./tracks/rule-cases_20261113/) — Shared rule-cases package | chore | critical | — | 9 / 9 |
| 2 | [ ] | [go-api-foundation_20261113](./tracks/go-api-foundation_20261113/) — Go API foundation | feature | critical | rule-cases (for the case runner) | 5 / 15 |
| 3 | [ ] | [monitoring_20261113](./tracks/monitoring_20261113/) — Monitoring: Grafana for API, Postgres and pictures | chore | high | go-api-foundation | 3 / 6 |
| 4 | [ ] | [beta-stack_20261113](./tracks/beta-stack_20261113/) — Side-by-side beta stack | chore | high | go-api-foundation | 4 / 8 |
| 5 | [ ] | [go-public-reads_20261113](./tracks/go-public-reads_20261113/) — Public reads in Go | refactor | high | beta-stack | 3 / 7 |
| 6 | [ ] | [go-sign-in_20261113](./tracks/go-sign-in_20261113/) — Sign-in owned by Go | feature | critical | beta-stack | 5 / 15 |
| 7 | [ ] | [go-signed-in-reads_20261113](./tracks/go-signed-in-reads_20261113/) — Signed-in reads in Go | refactor | high | go-sign-in, go-public-reads | 4 / 6 |
| 8 | [ ] | [go-writes-admin-player_20261113](./tracks/go-writes-admin-player_20261113/) — Admin and Player writes in Go | refactor | high | go-signed-in-reads | 3 / 4 |
| 9 | [ ] | [go-writes-queue_20261113](./tracks/go-writes-queue_20261113/) — Queue writes and offline contract in Go | refactor | critical | go-writes-admin-player | 5 / 9 |
| 10 | [ ] | [live-updates_20261113](./tracks/live-updates_20261113/) — Live updates | feature | high | go-writes-queue (events), beta-stack (B-12 result) | 2 / 5 |
| 11 | [ ] | [pictures-buckets_20261113](./tracks/pictures-buckets_20261113/) — Pictures on Railway Buckets | refactor | medium | go-writes-admin-player | 3 / 4 |
| 12 | [ ] | [ship-and-retire_20261113](./tracks/ship-and-retire_20261113/) — Ship the Go stack and retire Supabase | chore | medium | all earlier tracks | 3 / 7 |

`monitoring` and `beta-stack` can run in parallel after the foundation; `go-public-reads` and `go-sign-in` can run in parallel after `beta-stack`.
