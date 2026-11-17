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
- `railway config plan` shows the changes; `railway config apply` always plans first and asks to confirm. The CLI
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
  const pictures = bucket("pictures", { region: "<singapore region id>" }); // plan B only (B-31); immutable after creation

  const api = service("api", {
    source: github("jose-codegourmet/rotra-v2", { rootDirectory: "apps/api" }),
    healthcheck: "/healthz",
    replicas: 1, // one instance: live updates fan out in-process (B-08); more only when measured
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      ROTRA_AUTH_SIGNING_KEY: preserve(), // private signing key (B-27): Railway only, never in the file, the repo or Vercel
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
- **Live-update listener (B-26).** The API's live-update listener uses a **direct** database
  connection (one connection), because Railway's PgBouncer doesn't support LISTEN/NOTIFY. Everything
  else goes through the pool, so the `api` service gets both addresses.
- **Database.** High availability, backups / point-in-time recovery and connection pooling are turned
  on per database ([Railway PostgreSQL](https://docs.railway.com/databases/postgresql)). On Hobby the
  volume is capped at 5 GB; that's monitored, not acted on (B-14). Turn on **Query Statistics**
  (`pg_stat_statements`) in Database › Stats for each ROTRA database (B-19). It isn't on by default.
- **Signing key rotation (B-47).** Passes carry a key id; the public key list holds the current and the next key.
  Routine: add the new key in Railway → publish both → sign with the new → remove the old after 15 minutes plus
  the apps' key cache (about 10 minutes). Emergency: swap and remove at once. Nobody is signed out either way
  (refresh passes are database digests). If refresh digests leak too: revoke all sessions.
- **Deploy draining (B-44).** `RAILWAY_DEPLOYMENT_DRAINING_SECONDS=30` on `api`: on SIGTERM the old copy stops
  taking streams, sends spread-out reconnect hints, finishes writes in progress and exits.
- **Housekeeping (B-34).** The `api` service runs an hourly in-process loop (no cron, no extra
  service) that deletes old rows in batches of about 1,000 under an advisory lock: live-update events
  after 7 days, `auth_events` after 90 days, ended `auth_sessions` 90 days after they end. Retention
  values are configuration (`ROTRA_RETENTION_*`). Product scheduled jobs stay parked (B-07).
- **Pictures (B-31).** Plan A is a public **Cloudflare R2** bucket on a ROTRA picture subdomain,
  outside Railway; the `pictures` bucket in the example above exists only if the pictures track
  falls back to plan B. Plan A needs `rotra.club` as a Cloudflare zone (nameservers on Cloudflare's
  free plan, Vercel records DNS only). Plan B: Railway buckets are private only, so pictures are
  served by presigned URL behind a stable ROTRA picture address: bucket egress is free, service
  egress isn't ([buckets billing](https://docs.railway.com/storage-buckets/billing)). Either way the
  API never streams a picture's bytes to viewers.
- **Secrets** use `preserve()`, so `apply` keeps the value set in Railway and the file never holds one.
- **Environments:** `staging` (the side-by-side test) and `production`.

## Applying it

- Only from `main`, by hand, like the Vercel deploy: a manual GitHub Actions workflow runs `plan`, then
  `apply` in a separate job ([apply from GitHub Actions](https://docs.railway.com/infrastructure-as-code#apply-from-github-actions)).
  Never automatic, matching `git.deploymentEnabled: false` for Vercel.
- A plan that deletes a service, a variable, the database or the bucket is stopped and reviewed with
  the owner.

## Backend CI and Railway deploys

Railway deploys the Go API **only for backend changes**, and only after the backend CI passes.

| Piece | Where | What it does |
|---|---|---|
| Backend CI | `.github/workflows/backend.yml` | Required check on `main` (B-33): runs on every PR, with its Go jobs skipped unless the change touches `apps/api/**`, `packages/rule-cases/**`, `packages/rules-wasm/**` (once it exists, D-2026-11-14-01), `.railway/**` or itself. Job `scope` fails if the change also includes anything outside those paths, docs, `conductor/` and root `*.md`; one exception (B-37): `packages/rule-cases/**` may change together with the TypeScript shared-rule files in `packages/data`. Job `go` runs `go vet`, `go test -race -cover`, `go build`, golangci-lint and govulncheck. Job `scope` exposes whether a backend path changed; job `go` is skipped (counts as passing) when none did. A step runs `packages/rules-wasm/check-fresh.sh` once that script exists (rule-cases phase 5), to catch a stale `.wasm` |
| Frontend CI | `.github/workflows/ci.yml` | `paths-ignore` for the same backend paths, `docs/**`, `conductor/**` and root `*.md`, so a backend-only commit runs no frontend checks |
| Railway watch paths | `api` service settings | `/apps/api/**`, `/packages/rule-cases/**`, `/packages/rules-wasm/**`. Commits that don't touch them never build or deploy ([watch paths](https://docs.railway.com/deployments/monorepo#watch-paths)) |
| Railway "Wait for CI" | `api` service settings | The deploy waits in `WAITING` until the commit's GitHub Actions runs finish, and goes ahead only if they pass ([wait for CI](https://docs.railway.com/deployments/github-autodeploys#wait-for-ci)) |
| Branch | `api` service settings | `staging` deploys from `main` (the Go API merges into `main`; only UI changes use `go-stack`, B-20). `production` takes a commit only when the Go API ships (B-10) |

Why the frontend CI must skip backend commits: Railway's "Wait for CI" looks at **every** GitHub
Actions run on the commit, not just one workflow (checks from other GitHub apps are ignored). If
`ci.yml` also ran on a backend commit, a red frontend check would block a good backend deploy. With
`paths-ignore` plus the `scope` job, a backend commit has exactly one workflow: Backend CI.

Rules this sets:

- **A backend change ships alone.** One commit or PR touches the backend paths and docs only. A change
  that needs both a frontend and a backend part is two PRs; the backend one merges first.
- **Rule cases are shared.** `packages/rule-cases/**` counts as backend for CI. The frontend side of a
  case change is checked by `make check` (its Vitest runs), as for every change.
- **The rules `.wasm` is shared too** ([D-2026-11-14-01](../mvp/decisions.md#d-2026-11-14-01)).
  `packages/rules-wasm/**` counts as backend for CI, so a Go rule change and its rebuilt `.wasm` merge
  in one PR. `make check` checks the frontend side: the fingerprint of the Go rule files and the cases
  through the wrapper. The apps publish `rules-manifest.json`; the Go API stamps new Queue Sessions
  only with a version that manifest lists, capped by `RULES_VERSION_MAX` on the `api` service
  (normally unset) ([B-22](open-decisions.md)).
- **Backend CI is a required check on `main` (B-33).** A GitHub ruleset requires it, so a red
  Backend CI blocks the merge (auto-merge waits) as well as the deploy. `backend.yml` runs on every
  PR and skips its Go jobs when no backend path changed, so frontend PRs pass straight through. CI
  stays advisory for the frontend ([ways-of-working §5](../ways-of-working.md#5-branches-commits-prs));
  this exception is for backend paths only.
- Watch paths and "Wait for CI" are service settings. Turn them on in Railway when the `api`
  service is created; they aren't in the IaC example above.

## Side by side with the current apps (B-10)

```text
 Current (unchanged)                         New (testing the Go API)
 queue/player/admin.rotra.club               a second Vercel project, same repo, `go-stack` branch
   Vercel → Route Handlers → Supabase          Vercel → proxy.ts /api/* → Go API (Railway staging) → Railway Postgres
```

- The **same apps**, built from the long-lived **`go-stack` branch** (B-20), are deployed to a second
  Vercel project. `go-stack` holds only the UI changes that need the Go API; everything else (rule
  cases, `apps/api`, Railway) merges into `main`. `main` is merged into `go-stack` at least weekly and
  after every Queue epic. Shipping merges `go-stack` into `main` in one owner-reviewed PR.
- The forwarding must only exist in the new project. A rewrite in the shared `vercel.json` would hit
  both projects, so it goes in each app's `proxy.ts` (B-30; it was `next.config` before) and is
  turned on only when `ROTRA_GO_API_URL` is set. That variable is set only in the new project.
- **Proxy secret (B-30).** `proxy.ts` adds a secret header (`ROTRA_PROXY_SECRET`, set in the beta
  Vercel project and Railway) and the client IP. Go trusts the forwarded IP only with the secret,
  and without it answers only `/healthz` and the stream-ticket route.
- **Moved areas (`ROTRA_GO_MOVED_AREAS`).** Set only in a local test run (B-52) and, from staging-verification on, the beta Vercel project; unset everywhere else. A
  comma-separated list of `/api/*` prefixes Go owns; everything else still reaches its Route Handler.
  - **Start:** `/api/stream/ticket` (B-41).
  - **Each move track** adds its prefixes in its Switch step; removing a prefix undoes the move, since
    the Route Handler stays until ship.
  - **All moved:** the value becomes `/api` (variable change only, still undoable).
  - **Retire (ship-and-retire R3):** the Route Handlers are deleted, then the variable and its check go;
    `proxy.ts` forwards every `/api/*` to Go. `ROTRA_GO_API_URL` stays as the API address (required,
    the apps fail at start without it); the proxy secret, client IP and 10-second timeout stay
    (B-30, B-46); the "everyone is signed out" rule goes, since Go owns sign-in. The code lives in `@rotra/api-proxy` (B-51), not `packages/db`.
- **Railway's default domain (B-30).** Removing `*.up.railway.app` is optional until tested in
  go-api-foundation R6; if it stays, the proxy-secret rule protects it.
- The two stacks have **separate data**: the new one starts from a copy of the Supabase database,
  rehearsed with the import in [sign-in](../database_design/product/sign-in.md#moving-accounts-from-supabase).
- **Sign-in on beta is Go only (B-24).** The beta Vercel project holds no Supabase keys, so nothing on
  beta can reach production Supabase Auth; a leftover Supabase call fails instead. Until Go sign-in
  lands, the beta serves only what needs no sign-in, and real users don't get the beta domains.
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
