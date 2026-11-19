# Plan: Signed-in reads in Go

**Track ID:** go-signed-in-reads_20261113 · **Spec:** [spec.md](./spec.md)

Ticket: #876 (one issue for the whole track, under epic #869).

## Phase 1: Player

- [~] **1.1** Characterize + port me/account/clubs/sessions (done: account, clubs, verification, notifications, sessions, share, invites, contact-change; foundation = per-app router + optional viewer. Left: `/api/me/profile`, `/api/leaderboard/me`, which need the period standings)
- [ ] **1.2** Compare, #569 access and the signed-in match history read (#850)

## Phase 2: Admin

- [ ] **2.1** Characterize + port Admin lists and views

## Phase 3: Queue

- [ ] **3.1** Characterize + port club and session reads
- [ ] **3.2** Sync read

## Phase 4: Switch

- [ ] **4.1** Add this track's `/api/*` prefixes to the `ROTRA_GO_MOVED_AREAS` list (local now; the beta project gets the full list in staging-verification; remove a prefix to undo); manual check per app, locally

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
| 2026-11-19 | 1.1 | An expired pass on an optional-viewer route answers 401 `expired` instead of acting as a visitor | TS refreshed through cookies; a visitor answer would silently downgrade a signed-in player | Owner to confirm (auth decision) |
| 2026-11-19 | 1.1 | `hasPassword` reads `auth_identities.password_hash` (TS reads `auth.users`) | Go has no `auth.users` | Only read when Google is connected |
