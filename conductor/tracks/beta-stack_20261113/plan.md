# Plan: Side-by-side beta stack

**Track ID:** beta-stack_20261113 · **Spec:** [spec.md](./spec.md)

Ticket: #873 (one issue for the whole track, under epic #869).

## Phase 1: Rewrites (TypeScript, frontend PR)

- [x] **1.1** Env-gated forwarding in each app's `proxy.ts` (B-30; shared helper `@rotra/db/proxy/go-forward`)
- [x] **1.2** `make check`; verify the current project is unchanged

## Phase 2: Beta project

- [ ] **2.1** Create the Vercel project, env vars and domains (stop and ask: infrastructure)
- [ ] **2.2** Real mode loads on the three beta domains

## Phase 3: Beta data

- [ ] **3.1** Dump/restore Supabase → Railway staging; compare counts (stop and ask: data copy)
- [ ] **3.2** Point beta Route Handlers at Railway Postgres
- [ ] **3.3** Check the beta Vercel project has no Supabase variables (B-24); confirm a Supabase-backed action fails on beta and changes nothing in Supabase

## Phase 4: Stream test

- [x] **4.1** Stream ticket route (through `proxy.ts`) and a minimal Go stream endpoint on the API domain (B-41)
- [ ] **4.2** CORS for the app domains on the stream route (done in Go, tested); an hour-long stream test on staging (owner-gated, open)

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
| 2026-11-16 | 1.1 | `proxy.ts` forwarding instead of `next.config` rewrites | B-30 replaced B-05; rewrites can't add the secret header | Done in `proxy.ts` |
| 2026-11-16 | 2.1, 2.2, 3.1, 3.3, 4.2 (hour test) | Left open | Infrastructure and data copy are stop-and-ask; no Vercel tool, Supabase MCP unauthenticated | Owner decision needed |
| 2026-11-16 | 4.1 | Go ticket route `POST /api/stream/ticket`, stream `GET /stream`; tickets in memory | One instance (B-43), 60s lifetime | Add the ticket path to `ROTRA_GO_MOVED_AREAS` on beta |
| 2026-11-16 | 4.1 | Unset `ROTRA_PROXY_SECRET` also 404s `/readyz` | B-30 allows only `/healthz` and the ticket route | Health tests send the secret |
