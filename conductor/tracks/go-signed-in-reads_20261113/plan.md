# Plan: Signed-in reads in Go

**Track ID:** go-signed-in-reads_20261113 · **Spec:** [spec.md](./spec.md)

Ticket: #876 (one issue for the whole track, under epic #869).

## Phase 1: Player

- [x] **1.1** Characterize + port me/account/clubs/sessions (done: account, clubs, verification, notifications, sessions, share, invites, contact-change; foundation = per-app router + optional viewer. then profile, leaderboard period/search/me, rtr-ids stats, B-53/54/55/56/63 ported in the second commit)
- [x] **1.2** Compare, #569 access and the signed-in match history read (#850)

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
| 2026-11-19 | 1.1 | B-54 masked leaderboard row id is `masked-<position>`; masked profile omits rtrId and unclaimedSavedBy; `/rank` and `/games` are now `private, no-store` | B-54 gives no wire detail | Ported per the row; owner to confirm |
| 2026-11-19 | 1.1 | `/games` is not paged | B-54 gives no parameters or defaults | Left for owner; UI does not page |
| 2026-11-19 | 1.1 | `/rtr-ids/{rtrId}/stats` CORS allows only the exact Queue origins; the Queue/Player pairing is not checked | Go cannot see the pairing | Origin header must reach Go through go-forward |
| 2026-11-19 | 1.2 | Queue/Player origin pairing is not checked; `ROTRA_ALLOWED_ORIGINS` is used as the Queue origin list | Go cannot see the pairing | Owner: use a dedicated Queue-origins setting or confirm the env var holds Queue origins only |
| 2026-11-19 | 1.2 | Go database role needs EXECUTE on `public.rotra_player_compare` | Migration revokes it from PUBLIC | Grant before switching `/compare` |
| 2026-11-19 | 1.2 | my-night has no `recordGames` gate; access carries no standings; wire keys are `checkedIn`/`hasLeft` | Characterized from the TS | Ported as is |
