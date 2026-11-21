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
| 2 | [~] | [go-api-foundation_20261113](./tracks/go-api-foundation_20261113/) — Go API foundation | feature | critical | rule-cases phases 1–3 (spike, case runner) | 5 / 15 |
| 3 | [ ] | [monitoring_20261113](./tracks/monitoring_20261113/) — Monitoring: Grafana for API, Postgres and pictures | chore | high | go-api-foundation | 3 / 6 |
| 4 | [x] | [beta-stack_20261113](./tracks/beta-stack_20261113/) — Side-by-side beta stack | chore | high | go-api-foundation | 3 / 6 |
| 5 | [x] | [go-public-reads_20261113](./tracks/go-public-reads_20261113/) — Public reads in Go | refactor | high | beta-stack | 3 / 7 |
| 6 | [ ] | [go-sign-in_20261113](./tracks/go-sign-in_20261113/) — Sign-in owned by Go | feature | critical | beta-stack | 5 / 15 |
| 7 | [x] | [go-signed-in-reads_20261113](./tracks/go-signed-in-reads_20261113/) — Signed-in reads in Go | refactor | high | go-sign-in, go-public-reads | 6 / 6 |
| 8 | [x] | [go-writes-admin-player_20261113](./tracks/go-writes-admin-player_20261113/) — Admin and Player writes in Go | refactor | high | go-signed-in-reads | 4 / 4 |
| 9 | [~] | [go-writes-queue_20261113](./tracks/go-writes-queue_20261113/) — Queue writes and offline contract in Go | refactor | critical | go-writes-admin-player | 5 / 9 |
| 10 | [ ] | [go-sign-in-catch-up_20261119](./tracks/go-sign-in-catch-up_20261119/) — Google sign-in and the guest claim in Go | feature | high | go-sign-in | 3 / 7 |
| 11 | [ ] | [live-updates_20261113](./tracks/live-updates_20261113/) — Live updates | feature | high | go-writes-queue (events), beta-stack (ticket route, B-41) | 2 / 5 |
| 12 | [ ] | [pictures-buckets_20261113](./tracks/pictures-buckets_20261113/) — Pictures on Cloudflare R2 (Railway Buckets as the fallback, B-31) | refactor | medium | go-writes-admin-player | 3 / 4 |
| 13 | [ ] | [staging-verification_20261117](./tracks/staging-verification_20261117/) — Staging verification: live checks and load test (B-52) | chore | high | every move track (5–12) | 5 / 10 |
| 14 | [ ] | [ship-and-retire_20261113](./tracks/ship-and-retire_20261113/) — Ship the Go stack and retire Supabase | chore | medium | staging-verification | 3 / 7 |

## Backlog

Open items set aside on 2026-11-13. Not scheduled; each says when it must be picked up at the latest.

| ID | Item | Comes from | Pick up before |
|---|---|---|---|
| BL-1 | What mock mode does per area once its TypeScript rules are deleted (fixture answers or no mock mode) | [D-2026-11-13-08](../docs/mvp/decisions/2026-11-13.md#d-2026-11-13-08) | deleting that area's TypeScript copies on `go-stack` |
| BL-2 | Grace period and exact schedule checks for offline device time (owner OK) | [rule-cases Q2](./tracks/rule-cases_20261113/spec.md#owner-answers-2026-11-13), go-writes-queue R1a | go-writes-queue R1a |
| BL-3 | Ticket for the lineup contract change (device sends lineups instead of `n`) | rule-cases Q3, go-writes-queue R1a | go-writes-queue R1a |
| BL-4 | Mockup change: offline payments show the last synced amount due | rule-cases payments, go-writes-queue R3 | go-writes-queue R3 |
| BL-5 | Create the `go-stack` branch off `main` (B-20) | beta-stack R1 | staging-verification R1 |
| BL-6 | Service worker for the Queue app, so it and the rules `.wasm` load after an offline reload | [D-2026-11-14-01](../docs/mvp/decisions/2026-11-14.md#d-2026-11-14-01), rule-cases G12 | real clubs relying on offline reloads |
| BL-7 | Mockup change: "Sign in to sync N waiting changes", the revoked-device message, the sign-out warning with waiting changes, and the revoke dialog's offline-copy warning | [B-28](../docs/backend/open-decisions.md#settled) | go-sign-in R3 |
| BL-8 | Mockup change + ticket: read-only switch for the cutover (one setting; writes refused with a "ROTRA is updating" message) | [B-35](../docs/backend/open-decisions.md#settled) | ship-and-retire R2 |
| BL-9 | Backups and a restore drill: confirm what Railway Hobby includes, production schedule (suggested daily + weekly; point-in-time recovery after pricing), a timed restore drill on staging, a manual off-Railway `pg_dump` before ship and risky migrations | [B-40](../docs/backend/open-decisions.md#will-hurt-later) | ship-and-retire R1 |
| BL-10 | Ticket: the real Player club page reads the invite link (`?k=`) and shows Join only with it, as the mockup change `2026-11-19-player-club-page-join-needs-invite-link` says; until then the real Join link has no code and the server rejects it. No code change made in this track (owner: backlog only) | [B-55](../docs/backend/open-decisions.md#settled), [mockup change](../docs/mockup-changes/2026-11-19-player-club-page-join-needs-invite-link.md) | the next UI ticket batch for Player, and before real clubs share club-page links |
| BL-11 | Pictures track must also port the upload branches that answer 503 in Go: Admin `POST /api/profile-banners` and `/api/profile-characters`, the photo of `PATCH /api/players/{id}`, and the picture of `PATCH /api/me/profile`. Until then those paths cannot be listed in `ROTRA_GO_MOVED_AREAS`. Agreed design (owner, 2026-11-20): add one separate upload route that returns a picture reference; the edit routes then take only that reference in plain JSON, so no multipart branch is ported into each route | [go-writes-admin-player plan](./tracks/go-writes-admin-player_20261113/plan.md) | pictures-buckets |
| BL-14 | Go `GET /api/claim/{token}` preset email ignores the record's shared-entry email; the TypeScript uses `sharedEntry.email ?? privateInput.email`. The `shared_entry_email` column is now in `GetClubPlayerClaimLinkView` | [claim fix](./tracks.md) | go-sign-in-catch-up |
| BL-15 | Queue live-update outbox events (go-writes-queue R4, task 4.1): needs a migration (events table, `latest_event_id`, `xact_id`) with owner sign-off on the SQL (B-36); deferred by the owner 2026-11-20. Queue writes in Go append no event yet | [go-writes-queue plan](./tracks/go-writes-queue_20261113/plan.md) | go-writes-queue 4.1 |
| BL-16 | `rules_version` stamping on Start (R1a, B-22): needs a migration (stop and ask); deferred by the owner 2026-11-20 together with BL-2 and BL-3 (Go keeps server time and generates from `n`) | [go-writes-queue spec](./tracks/go-writes-queue_20261113/spec.md) | go-writes-queue R1a |
| BL-17 | Two bugs on `main` that Go copies as they are (owner to decide): Session done with a placed but never started match answers 500 (court-usage release check, F6); Move to waitlist on a live session always answers 422 (level-lock trigger) | [go-writes-queue plan](./tracks/go-writes-queue_20261113/plan.md) | main fix |
| BL-13 | Extend the grants migration `20261119000200_go_api_role_grants` to the write tables (INSERT/UPDATE on audit events, clubs, club accounts, terms, identities, feature flags, ranking versions, notifications and more) before Go moves to a least-privilege role; not needed while Go connects as the owner `postgres` | [go-writes-admin-player plan](./tracks/go-writes-admin-player_20261113/plan.md) | staging-verification |
| BL-18 | Queue offline on the device in real mode (found by the local replay check, go-writes-queue 5.1): fixed in ticket #999 (offline reducers, replay reads, the "needs attention" flag, the offline notice). Still open: the TanStack pause on a real network cut was not reproduced with the browser's offline signal and is not checked on a phone (confirm on a phone, then set `networkMode: 'always'` for the outbox commands if it pauses); the replay bypass of the device copy is global while a replay runs (design call) | [go-writes-queue plan](./tracks/go-writes-queue_20261113/plan.md), [MVP status](../docs/mvp/README.md) | staging-verification |

**Testing (B-52).** Tracks 3–11 check their work locally (apps → local Go API → local Postgres); live checks on Railway and Vercel run once in `staging-verification`, and what they find is logged as bugs.

`monitoring` and `beta-stack` can run in parallel after the foundation; `go-public-reads` and `go-sign-in` can run in parallel after `beta-stack`.

**Beta sign-in (B-24).** The beta Vercel project never holds Supabase keys, so it has no sign-in until `go-sign-in` lands; before that it serves only public pages and reads, and real users don't get the beta domains.
