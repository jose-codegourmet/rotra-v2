# Backend infrastructure on Railway

**Last verified:** 2026-11-13 against Railway's docs · **Decision:** [D-2026-11-13-01](../mvp/decisions.md#d-2026-11-13-01)

**Status:** Target setup, not built. Nothing here exists in Railway or in the repo yet. What runs
today is in [architecture §12](../architecture.md#12-open-architecture-decisions).

## Infrastructure as Code, not `railway.json`

Railway replaced Config as Code (`railway.json` / `railway.toml`) with **Infrastructure as Code**: one
file, `.railway/railway.ts`, for the whole project.

- Config as Code is deprecated. **New services can't opt into it**, and existing files stop working
  after the hard cutoff on **2026-12-01**
  ([Config as Code](https://docs.railway.com/config-as-code)). ROTRA never adds a `railway.json` or
  `railway.toml`.
- TypeScript authoring is generally available; Python and Go are in beta
  ([IaC](https://docs.railway.com/infrastructure-as-code)). ROTRA uses **TypeScript**, the stable one,
  even though the API is in Go.
- The file imports `railway/iac`, from the `railway` npm package installed at the repo root
  (`nvm use && pnpm add -Dw railway`). Approved as a root dev dependency (B-17,
  [coding conventions](../coding-conventions.md)); it's added in the first infrastructure ticket.
- `railway plan` shows the changes; `railway apply` always plans first and asks to confirm. The CLI
  finds the nearest `.railway/railway.ts`, so it runs from the repo root.

## What the file declares

The shape follows Railway's [IaC reference](https://docs.railway.com/infrastructure-as-code/reference)
(`defineRailway`, `project`, `service`, `postgres`, `bucket`, `group`, `github`, `preserve`).
Illustration, not a file to commit yet:

```ts
// .railway/railway.ts
import { bucket, defineRailway, github, group, postgres, preserve, project, service } from "railway/iac";

export default defineRailway((ctx) => {
  const prod = ctx.environment === "production";

  const db = postgres("postgres");
  const pictures = bucket("pictures", { region: "<singapore region id>" }); // immutable after creation

  const api = service("api", {
    source: github("jose-codegourmet/rotra-v2", { rootDirectory: "apps/api" }),
    healthcheck: "/healthz",
    replicas: 1, // one instance: live updates fan out in-process (B-08); more only when measured
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      ROTRA_AUTH_SIGNING_KEY: preserve(), // secrets are set in Railway, never in the file
      OTEL_EXPORTER_OTLP_ENDPOINT: preserve(),
      OTEL_EXPORTER_OTLP_HEADERS: preserve(),
    },
    domains: prod ? ["api.rotra.club"] : ["api-beta.rotra.club"],
  });

  const alloy = service("alloy", { /* Grafana Alloy, see Monitoring */ });

  return project("rotra", {
    resources: [group("Backend", [api, db]), group("Storage", [pictures]), group("Monitoring", [alloy])],
  });
});
```

Notes:

- **Region.** Use Railway's identifier for **Singapore** (Asia Southeast) from the
  [region list](https://docs.railway.com/deployments/regions#region-options), next to Vercel `sin1`.
  The exact string is checked when the file is written. **Bucket regions can't be changed after
  creation**, so the bucket must be right the first time.
- **Database.** High availability, backups / point-in-time recovery and connection pooling are turned
  on per database ([Railway PostgreSQL](https://docs.railway.com/databases/postgresql)). On Hobby the
  volume is capped at 5 GB; that's monitored, not acted on (B-14). Turn on **Query Statistics**
  (`pg_stat_statements`) in Database › Stats for each ROTRA database (B-19). It isn't on by default.
- **Pictures** are served by presigned URL: bucket egress is free, service egress isn't
  ([buckets billing](https://docs.railway.com/storage-buckets/billing)). The API never streams a
  picture.
- **Secrets** use `preserve()`, so `apply` keeps the value set in Railway and the file never holds one.
- **Environments:** `staging` (the side-by-side test) and `production`.

## Applying it

- Only from `main`, by hand, like the Vercel deploy: a manual GitHub Actions workflow runs `plan`, then
  `apply` in a separate job ([apply from GitHub Actions](https://docs.railway.com/infrastructure-as-code#apply-from-github-actions)).
  Never automatic, matching `git.deploymentEnabled: false` for Vercel.
- A plan that deletes a service, a variable, the database or the bucket is stopped and reviewed with
  the owner.

## Side by side with the current apps (B-10)

```text
 Current (unchanged)                         New (testing the Go API)
 queue/player/admin.rotra.club               a second Vercel project, same repo and apps
   Vercel → Route Handlers → Supabase          Vercel → /api/* rewrite → Go API (Railway staging) → Railway Postgres
```

- The **same apps and the same `main`** are deployed to a second Vercel project. No code is forked.
- The rewrite must only exist in the new project. A rewrite in the shared `vercel.json` would hit
  both projects, so it goes in each app's `next.config` and is turned on only when
  `ROTRA_GO_API_URL` is set. That variable is set only in the new project.
- The two stacks have **separate data**: the new one starts from a copy of the Supabase database,
  rehearsed with the import in [sign-in](../database_design/product/sign-in.md#moving-accounts-from-supabase).
- **Shipping** = a final copy of the data, then the production domains move to the new project and the
  old project is kept, untouched, until the owner signs off.
- **Domains (B-18):**

  | | Side by side (testing) | After shipping |
  |---|---|---|
  | Queue | `queue-beta.rotra.club` | `queue.rotra.club` moves to the new project |
  | Player | `player-beta.rotra.club` | `player.rotra.club` |
  | Admin | `admin-beta.rotra.club` | `admin.rotra.club` |
  | Go API | `api-beta.rotra.club` (Railway `staging`) | `api.rotra.club` (Railway `production`) |

  The beta apps set `NEXT_PUBLIC_ROTRA_QUEUE_URL`, `NEXT_PUBLIC_ROTRA_PLAYER_URL` and
  `NEXT_PUBLIC_ROTRA_ADMIN_URL` to the beta domains, so cross-app links (#569) stay inside the beta
  stack. Cookies stay host-only, so the two stacks never share a sign-in.

## Monitoring

Planned in [observability](../observability.md#planned-go-api-postgres-and-pictures-on-railway).
