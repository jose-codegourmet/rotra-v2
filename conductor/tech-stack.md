# Tech stack — backend

> Target state from [D-2026-11-13-01](../docs/mvp/decisions.md#d-2026-11-13-01). Until an area moves,
> [architecture.md](../docs/architecture.md) describes what runs.

## Today (being replaced, area by area)

Next.js 16 Route Handlers → `packages/db` services (Prisma) → Supabase Postgres; Supabase Auth and
Storage; Vercel `sin1`.

## Target

| Concern | Choice | Source |
|---|---|---|
| Language | Go (version pinned in `apps/api/go.mod` by the foundation track) | B-01 |
| Location | `apps/api` (one Go module) | proposal |
| HTTP | `net/http` (+ a router chosen in the foundation spike) | foundation |
| Database | Railway Postgres (Singapore), HA / backups / PITR / pooling on | B-03 |
| Schema owner | Prisma migrations until `packages/db` is retired | proposal |
| DB access from Go | `pgx` + generated queries (tool chosen in the foundation spike) | foundation |
| Sign-in | Go-owned, tables in [sign-in design](../docs/database_design/product/sign-in.md) | B-04, B-11 |
| Pictures | Railway Buckets, presigned URLs, no CDN | B-06, B-13 |
| Live updates | Outbox events in the write transaction → in-process fan-out (Postgres notifications) → stream to browsers; refresh is the fallback | B-08, B-12 |
| Rules | Shared queue rules: one Go copy in `apps/api/internal/rules`, built to WebAssembly for the device (`packages/rules-wasm`, types by `tygo`), versioned per Queue Session; JSON cases in `@rotra/rule-cases`. Go-only rules in Go; device-only rules (generation, labels) in TypeScript | B-02, D-2026-11-13-02, D-2026-11-13-08, D-2026-11-14-01, B-21–B-23 |
| Transport | Each app rewrites `/api/*` to the Go API (env-gated) | B-05 |
| Infrastructure | Railway IaC, `.railway/railway.ts` (`railway` dev dependency) | B-17 |
| Observability | OpenTelemetry to Grafana Cloud; Grafana Alloy for Postgres | B-16 |
| CI | `.github/workflows/backend.yml`; Railway watch paths + Wait for CI | [backend CI](../docs/backend/infrastructure.md#backend-ci-and-railway-deploys) |
| Hosting | Railway Hobby to start; staging + production environments | B-09, B-14 |

New Go libraries are dependencies too: each one is named in its track and approved before use
([coding conventions](../docs/coding-conventions.md)).
