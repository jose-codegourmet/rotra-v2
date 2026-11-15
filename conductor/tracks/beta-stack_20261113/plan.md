# Plan: Side-by-side beta stack

**Track ID:** beta-stack_20261113 · **Spec:** [spec.md](./spec.md)

Ticket: #873 (one issue for the whole track, under epic #869).

## Phase 1: Rewrites (TypeScript, frontend PR)

- [ ] **1.1** Env-gated rewrites in each app's `next.config`
- [ ] **1.2** `make check`; verify the current project is unchanged

## Phase 2: Beta project

- [ ] **2.1** Create the Vercel project, env vars and domains (stop and ask: infrastructure)
- [ ] **2.2** Real mode loads on the three beta domains

## Phase 3: Beta data

- [ ] **3.1** Dump/restore Supabase → Railway staging; compare counts (stop and ask: data copy)
- [ ] **3.2** Point beta Route Handlers at Railway Postgres
- [ ] **3.3** Check the beta Vercel project has no Supabase variables (B-24); confirm a Supabase-backed action fails on beta and changes nothing in Supabase

## Phase 4: Stream test

- [ ] **4.1** Stream ticket route (through `proxy.ts`) and a minimal Go stream endpoint on the API domain (B-41)
- [ ] **4.2** CORS for the app domains on the stream route; an hour-long stream test on staging

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
