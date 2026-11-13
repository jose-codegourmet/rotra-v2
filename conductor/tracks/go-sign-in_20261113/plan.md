# Plan: Sign-in owned by Go

**Track ID:** go-sign-in_20261113 · **Spec:** [spec.md](./spec.md)

Each phase becomes one ticket (or a few) under the Go API epic; link them here.

## Phase 1: Tables

Ticket: needed

- [ ] **1.1** Prisma migration for the sign-in tables (stop and ask: migration)
- [ ] **1.2** Query layer + tests on Postgres

## Phase 2: Core

Ticket: needed

- [ ] **2.1** Password hashing (argon2id, bcrypt verify, rehash)
- [ ] **2.2** Session create / refresh rotation / reuse detection
- [ ] **2.3** Sign-out, sign-out device, sign-out all
- [ ] **2.4** Rate limits

## Phase 3: Flows

Ticket: needed

- [ ] **3.1** Club sign-in (username)
- [ ] **3.2** Player sign-in (email) and claim
- [ ] **3.3** Admin sign-in
- [ ] **3.4** Admin-reviewed recovery link
- [ ] **3.5** Queue device enrollment

## Phase 4: Apps

Ticket: needed

- [ ] **4.1** `proxy.ts` session check behind `ROTRA_GO_API_URL` (frontend PR, `make check`)
- [ ] **4.2** Device list screen data for owner/Admin (contract only; screens follow mockup process)

## Phase 5: Import

Ticket: needed

- [ ] **5.1** Account import tool (tests: idempotent, bcrypt)
- [ ] **5.2** Rehearse on staging; report (stop and ask)

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
