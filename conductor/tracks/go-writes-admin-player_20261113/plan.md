# Plan: Admin and Player writes in Go

**Track ID:** go-writes-admin-player_20261113 · **Spec:** [spec.md](./spec.md)

Ticket: #877 (one issue for the whole track, under epic #869).

## Phase 1: Admin

- [ ] **1.1** Characterize + port each Admin write group
- [ ] **1.2** Audit events identical

## Phase 2: Player

- [ ] **2.1** Characterize + port each Player write group

## Phase 3: Switch

- [ ] **3.1** Add this track's `/api/*` prefixes to the `ROTRA_GO_MOVED_AREAS` list (local now; the beta project gets the full list in staging-verification; remove a prefix to undo); manual check locally

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
| 2026-11-19 | 1.1 flags | `POST /api/feature-flags` with a `commandId` Postgres refuses (missing, not a UUID, a `urn:uuid:` form, spaces) answers 422 `invalid` with no fields | The Route Handler crashes on it with a 500 (Prisma). Postgres's own UUID forms (braces, hyphens after any four digits, either case) still pass | Pinned with `goExpects` in `flags.cases.json` |
| 2026-11-19 | 1.1 flags | A former or unknown admin gets 401 `unauthenticated`, not 403 `wrong_account` | The sign-in pass check is the same as the reads' (see `admin.cases.json` `guard_former_admin`) | Pinned with `goExpects` |
| 2026-11-19 | 1.1 flags | A request body over 1 MiB is answered like a body that is not JSON (422) | Next has no limit; an open reader is a memory risk in a long-lived server | Go-only guard, tested in `internal/writes` |
| 2026-11-19 | 1.1 flags | Two adds of one command under different keys can both answer 201 with one audit event (the second finds the first's event in `recordAudit` and writes none) | The TypeScript does the same (the lookup, then the insert); timing decides | Ported as is; tested for what always holds in `flags_race_test.go` |
