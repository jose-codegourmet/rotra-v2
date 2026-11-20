# Track specification: Environment variables, what is missing and how to set it

**Track ID:** env-setup_20261121 · **Type:** chore · **Priority:** high (order 15 of 15, run before order 13) · **Created:** 2026-11-21
**Depends on:** go-writes-queue · **Blocks:** staging-verification (1.1 creates env vars) · **Guide:** [environment-setup.md](../../../docs/backend/environment-setup.md)

## Why

The Go API reads 20-odd variables and the apps read a handful more, but nothing lists them in one place, and the Go service on Railway has only three of them set. Several merged features answer 503 or serve no routes until a variable exists: sign-in (no signing key), the Queue visitor join request (no receipt secret), the Player stats read (no Queue origins). This track lists what is missing, writes the guide for setting each one, and has the owner set them. Setting a secret, a Railway variable or a Vercel variable is infrastructure and auth: stop and ask, and no secret value is ever pasted in chat, a PR or a file.

## What is set today (checked 2026-11-21, names only)

Railway project `accomplished-warmth`, environment `production`, service `rotra-v2` (the Go API):

| Set | Not set |
|---|---|
| `DATABASE_URL`, `ROTRA_ALLOWED_ORIGINS`, `ROTRA_PROXY_SECRET` (plus Railway's own `RAILWAY_*`) | `ROTRA_AUTH_SIGNING_KEY`, `ROTRA_VISITOR_RECEIPT_SECRET`, `ROTRA_QUEUE_ORIGINS`, `RAILWAY_DEPLOYMENT_DRAINING_SECONDS`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS` |

The Vercel beta project and the GitHub Actions secrets were not checked (no Vercel tool in this session). R2 covers them. Only a `production` environment exists in that Railway project; the docs call the side-by-side one `staging`. R1 decides which it is.

## Requirements

### R1: Audit every place variables live

Compare what the code reads against what is set, for each of: the Go API on Railway, the beta Vercel project (three apps), GitHub Actions (secrets and variables), and local development. Output: the table in the guide, with one row per variable (name, who reads it, required or optional, secret or not, where it is set, status).

**Accepted when:**

- [ ] Every variable read by `apps/api/internal/config`, the apps' `process.env` reads and the workflows appears in the guide
- [ ] The Railway, Vercel and GitHub columns say set or not set, from names only (never values)
- [ ] The question of which Railway environment is the staging one is answered

### R2: A guide that anyone can follow

[environment-setup.md](../../../docs/backend/environment-setup.md): for each missing variable, what it does, what breaks without it, how to generate the value, where to put it, and how to check it worked. Plus `apps/api/.env.example` (the Go API has none today; `packages/db/.env.example` covers only the apps).

**Accepted when:**

- [ ] The guide covers every "not set" row, including the two values that must match across Vercel and Railway (`ROTRA_PROXY_SECRET`, `ROTRA_VISITOR_RECEIPT_SECRET`)
- [ ] `apps/api/.env.example` lists every variable the Go config reads, with placeholders only
- [ ] gitleaks passes on the change

### R3: The owner sets them

The owner generates each secret on their own machine and pastes it into Railway or Vercel. Claude can read variable names back to confirm they exist, never values.

**Accepted when:**

- [ ] Every required variable is set on the Go service and the beta Vercel project, and the audit table says so
- [ ] A sign-in on the Go stack works and a Queue visitor join request is accepted (local or staging check)
- [ ] The Railway beta DB password rotation (open since go-writes-queue) is done or logged as skipped by the owner

## Scope

In: variable names, generation commands, the guide, `apps/api/.env.example`, docs. Out: changing how any variable is read (no config code change), new variables, Supabase keys on the beta project (B-24: beta never holds them), the Cloudflare R2 and Grafana accounts (their own tracks create those values; this guide only says where the result goes).

## Constraints

- Secrets are never in chat, the repo, a PR or a log. `preserve()` in `.railway/railway.ts` is how the future IaC file keeps them.
- Backend CI `scope`: this change touches `apps/api/.env.example`, `docs/` and `conductor/` only.
- Setting any Railway or Vercel variable is the owner's action (stop and ask).
