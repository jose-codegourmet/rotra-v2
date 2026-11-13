# Plan: Side-by-side beta stack

**Track ID:** beta-stack_20261113 · **Spec:** [spec.md](./spec.md)

Each phase becomes one ticket (or a few) under the Go API epic; link them here.

## Phase 1: Rewrites (TypeScript, frontend PR)

Ticket: #801

- [ ] **1.1** Env-gated rewrites in each app's `next.config`
- [ ] **1.2** `make check`; verify the current project is unchanged

## Phase 2: Beta project

Ticket: #802

- [ ] **2.1** Create the Vercel project, env vars and domains (stop and ask: infrastructure)
- [ ] **2.2** Real mode loads on the three beta domains

## Phase 3: Beta data

Ticket: #803

- [ ] **3.1** Dump/restore Supabase → Railway staging; compare counts (stop and ask: data copy)
- [ ] **3.2** Point beta Route Handlers at Railway Postgres

## Phase 4: Stream test

Ticket: #804

- [ ] **4.1** Minimal Go stream endpoint behind the rewrite; measure connection life on Vercel
- [ ] **4.2** Record the B-12 outcome

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
