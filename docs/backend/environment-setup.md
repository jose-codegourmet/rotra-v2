# Environment variables: what to set and how

**Last verified:** 2026-11-21 against `apps/api/internal/config`, the apps' `process.env` reads and the Railway service's variable names · **Track:** [env-setup_20261121](../../conductor/tracks/env-setup_20261121/spec.md)

Rules: a secret is generated on your own machine and pasted straight into Railway or Vercel. Never put one in
chat, a PR, a commit, a log or an `.env.example`. Values below are placeholders.

## 1. Go API on Railway (service `rotra-v2`)

| Variable | Needed for | If missing | Secret | Status (names only, 2026-11-21) |
|---|---|---|---|---|
| `DATABASE_URL` | Everything | API will not start | yes | set |
| `ROTRA_PROXY_SECRET` | Trusting the client IP the apps forward; every route except `/healthz` and the stream routes | those routes answer 404 | yes | set (must equal the Vercel value) |
| `ROTRA_ALLOWED_ORIGINS` | CORS on the stream routes | browser blocks the stream | no | set |
| `ROTRA_AUTH_SIGNING_KEY` | Signing sign-in passes (B-27) | the API serves no auth routes: no sign-in | yes | **not set** |
| `ROTRA_VISITOR_RECEIPT_SECRET` | Queue visitor join request and my-request | those routes answer 503 | yes | **not set** (must equal the Vercel value) |
| `ROTRA_QUEUE_ORIGINS` | Credentialed Player stats read from the Queue app | no Queue origin is allowed | no | **not set** |
| `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` = `30` | Drain streams on deploy (B-44) | old copy is killed at once | no | **not set** |
| `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS` | Traces to Grafana (monitoring track) | telemetry off | headers: yes | **not set** (optional until monitoring) |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_BASE` | Google sign-in for players (all three or none; [setup](google-sign-in-setup.md#in-the-go-api-track-go-sign-in-catch-up)) | Continue with Google answers "unavailable"; with only some of them, or a bad redirect base, Google stays off and the API logs a warning (it still starts) | secret: yes | **not set** (no Google OAuth client exists yet) |
| `ROTRA_AUTH_EXTRA_PUBLIC_KEYS` | Key rotation only (B-47) | nothing | no | not needed now |
| `ROTRA_AUTH_HASH_CONCURRENCY`, `DB_MAX_CONNS`, `LOG_LEVEL`, `PORT`, `SHUTDOWN_TIMEOUT`, `HOUSEKEEPING_*`, `RETENTION_*` | Tuning | defaults apply | no | leave unset; see `apps/api/README.md` |

### How to set each

**`ROTRA_AUTH_SIGNING_KEY`** (secret, Railway only; never Vercel or the repo)

```bash
cd apps/api && go run ./cmd/authkey
```

It prints the signing key, the matching public key and a key id. Paste only the `ROTRA_AUTH_SIGNING_KEY=` value into
Railway, then close the terminal. Nothing is stored. Check: the sign-in test in staging-verification, or locally a
sign-in request answers something other than "no such route".

**`ROTRA_VISITOR_RECEIPT_SECRET`** (secret, same value on Railway and the Next apps)
Use the value the Next apps already use, so receipts issued before the move still match. If the Next apps never had one set
(visitor routes were answering 503 there too), generate a new one and set it in both places:

```bash
openssl rand -base64 32
```

It is read exactly as given, with no trimming: no trailing newline or space when you paste it.

**`ROTRA_PROXY_SECRET`** is already on Railway. Set the same value on the beta Vercel project (every app). Rotate both
together.

**`ROTRA_QUEUE_ORIGINS`**: comma-separated exact Queue app origins, no `*`, path or trailing slash, for example
`https://queue-beta.rotra.club`. Keep it apart from `ROTRA_ALLOWED_ORIGINS`.

**`RAILWAY_DEPLOYMENT_DRAINING_SECONDS`**: `30`.

**OpenTelemetry**: only when the monitoring track creates the Grafana Cloud stack. The endpoint looks like
`https://otlp-gateway-<region>.grafana.net/otlp`; the headers value is `Authorization=Basic%20<base64 of instanceId:token>`.

## 2. Beta Vercel project (queue, player, admin), not checked yet

Set in staging-verification 1.1. From `packages/db/.env.example` and [infrastructure](infrastructure.md):

| Variable | Value |
|---|---|
| `ROTRA_GO_API_URL` | the Go API's public address, for example `https://api-beta.rotra.club` |
| `ROTRA_GO_MOVED_AREAS` | the moved `/api/*` entries; applied only at staging-verification, with the stream-ticket route. A plain entry is a whole-segment prefix (`/api/auth`). An entry starting with `=` is one exact path where `*` is exactly one segment: `=/api/register/*/google` moves only Google registration (`POST /api/register/{clubId}/google`) and leaves `/api/register` and `/api/register/google` (the Admin link) in TypeScript. The password route `/api/register/{clubId}` has the same segment count as `/api/register/google`, so no entry can move one and not the other; it stays in TypeScript until the Admin-link registration is ported |
| `ROTRA_PROXY_SECRET` | same as Railway |
| `ROTRA_VISITOR_RECEIPT_SECRET` | same as Railway |
| `NEXT_PUBLIC_ROTRA_QUEUE_URL`, `NEXT_PUBLIC_ROTRA_PLAYER_URL`, `NEXT_PUBLIC_ROTRA_ADMIN_URL` | the beta app domains |

The beta project never holds Supabase keys (B-24). Whether it holds `DATABASE_URL` is an open question for 1.2: B-52 says no database address outside Railway.

## 3. GitHub Actions

Used by the deploy workflows: secret `VERCEL_TOKEN`, variables `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`. Not checked. The Railway
apply workflow will need its own token when `.railway/railway.ts` lands.

## 4. Local development

`packages/db/.env.example` covers the apps. The Go API has [apps/api/.env.example](../../apps/api/.env.example): copy it to `.env.local`, set `DATABASE_URL`
and, to reach routes beyond `/healthz`, `ROTRA_PROXY_SECRET` and the `X-Rotra-Proxy-Secret` header (see `apps/api/README.md`).
The Google block is optional: leave it empty and the API starts with Continue with Google answering "unavailable".

## 5. After setting

Ask Claude to read the names back (names only) to confirm they exist. Rotate the Railway beta database password if you have
not yet; it was exposed earlier in the migration work.
