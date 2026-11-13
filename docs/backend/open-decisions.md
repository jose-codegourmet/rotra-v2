# Backend open decisions

**Last verified:** 2026-11-13 · **Status:** B-01 to B-19 decided November 13, 2026
([D-2026-11-13-01](../mvp/decisions.md#d-2026-11-13-01)). Nothing is open right now. Never fill a new question in by guessing.

## Open

None since November 13, 2026. New backend questions go here with the next B-id (B-20).

## Settled

| ID | Decision | Date | Recorded in |
|---|---|---|---|
| B-15 | **Rule-cases package approved:** `@rotra/rule-cases`, JSON cases only, as described in [D-2026-11-13-02](../mvp/decisions.md#d-2026-11-13-02) | 2026-11-13 | D-2026-11-13-02 |
| B-16 | **Monitoring plan approved**, with the Grafana Alloy service for Postgres and starting alert thresholds (tuned after the first weeks of real data) in [observability](../observability.md#planned-go-api-postgres-and-pictures-on-railway) | 2026-11-13 | D-2026-11-13-01 |
| B-17 | **`railway` npm package approved** as a root dev dependency, imported only by `.railway/railway.ts` | 2026-11-13 | D-2026-11-13-01; [coding conventions](../coding-conventions.md) |
| B-18 | **Side-by-side domains:** `queue-beta.rotra.club`, `player-beta.rotra.club`, `admin-beta.rotra.club` for the second Vercel project; `api-beta.rotra.club` for the Go API on Railway staging, `api.rotra.club` in production. The production app domains move to the new project at ship time | 2026-11-13 | D-2026-11-13-01; [infrastructure](infrastructure.md#side-by-side-with-the-current-apps-b-10) |
| B-19 | **`pg_stat_statements` is available** on Railway Postgres as an opt-in: Database › Stats › Query Statistics › **Enable** (seen on an existing Railway Postgres service, which also shows `max_connections` = 500). Turn it on for each ROTRA database | 2026-11-13 | D-2026-11-13-01 |
| B-10 | **Side by side, then ship.** A second Vercel project deploys the same apps from the same `main`, with `/api/*` rewritten to the Go API on Railway staging; the current project keeps running on Route Handlers + Supabase. The two have separate data. When the Go API is ready for production, a final data copy moves over and the production domains switch to the new project | 2026-11-13 | D-2026-11-13-01; [infrastructure](infrastructure.md#side-by-side-with-the-current-apps-b-10) |
| B-11 | **Sign-in tables designed** in [database design › sign-in](../database_design/product/sign-in.md) (proposed design, not migration SQL) | 2026-11-13 | D-2026-11-13-01 |
| B-12 | **Recommendation taken:** try the live stream through the `/api/*` rewrite on staging; if it doesn't hold, the app's `/api/*` issues a short single-use stream ticket and the browser opens the stream on the API's own domain | 2026-11-13 | D-2026-11-13-01 |
| B-13 | **No CDN** for now; pictures go by presigned URL | 2026-11-13 | D-2026-11-13-01 |
| B-14 | **Just monitor** the Hobby limits (5 GB volume); no upgrade trigger set for a small MVP | 2026-11-13 | D-2026-11-13-01 |
| B-01 | **Go API.** Server code moves from Next.js Route Handlers + `packages/db` to one Go API, one area at a time; each Route Handler keeps running until its area moves | 2026-11-13 | [D-2026-11-13-01](../mvp/decisions.md#d-2026-11-13-01) |
| B-02 | **Shared test-case package** (option A, as decided with the partner). Rules stay in TypeScript for the device; their test cases live as JSON in a shared package, and both Vitest and the Go tests must pass them. No rule moves to Go until Go passes every case; money and ranking rules still need sign-off on their cases | 2026-11-13 | D-2026-11-13-01 |
| B-03 | **Railway for the API and the database.** Go API and Postgres on Railway, Singapore region. The Next.js apps stay on Vercel | 2026-11-13 | D-2026-11-13-01; [architecture §12](../architecture.md#12-open-architecture-decisions) |
| B-04 | **Sign-in owned by the Go API**, with: rate limits (per account, per IP **and per device**); a **signed-in device list** (each sign-in is a named device session that its owner or Admin can sign out); **offline device enrollment** (the Queue device that downloads a session registers with the server). Every current rule stays: club usernames, Admin-reviewed player recovery, host-only cookies per app, no social login | 2026-11-13 | D-2026-11-13-01; amends [D-2026-11-11-04](../mvp/decisions.md#d-2026-11-11-04) (device enrollment is no longer "not built for MVP"; the rest of the device-stream protocol still is) |
| B-05 | **Each app rewrites `/api/*` to the Go API** (option A). Fetcher URLs and host-only cookies stay unchanged | 2026-11-13 | D-2026-11-13-01 |
| B-06 | **Railway Buckets for pictures**, served with presigned URLs so bucket egress stays free; no CDN for now (B-13). The keep-current-and-previous rule of [D-2026-11-09-10](../mvp/decisions.md#d-2026-11-09-10) stays | 2026-11-13 | D-2026-11-13-01; amends [D-2026-11-08-03](../mvp/decisions.md#d-2026-11-08-03) |
| B-07 | **No scheduled jobs.** They are planned but not built and stay parked ([D-2026-11-11-10](../mvp/decisions.md#d-2026-11-11-10)); nothing is built for them in Go | 2026-11-13 | D-2026-11-13-01 |
| B-08 | **Live updates across the backend**, the reason for the Go API. Every app gets server-pushed updates. The Refresh bar, pull-down and tab-return refresh **stay as the fallback** when the connection drops, so the layout doesn't change. What a player may see doesn't change: masked names, own standing only, unpublished results out of the page data | 2026-11-13 | D-2026-11-13-01; amends [D-2026-11-09-04](../mvp/decisions.md#d-2026-11-09-04) and [D-2026-11-09-09](../mvp/decisions.md#d-2026-11-09-09) |
| B-09 | **Cost:** start on the existing Railway Hobby plan and monitor usage; upgrade trigger open (B-14) | 2026-11-13 | D-2026-11-13-01 |
