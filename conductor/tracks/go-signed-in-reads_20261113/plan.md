# Plan: Signed-in reads in Go

**Track ID:** go-signed-in-reads_20261113 · **Spec:** [spec.md](./spec.md)

Ticket: #876 (one issue for the whole track, under epic #869).

## Phase 1: Player

- [x] **1.1** Characterize + port me/account/clubs/sessions (done: account, clubs, verification, notifications, sessions, share, invites, contact-change; foundation = per-app router + optional viewer. then profile, leaderboard period/search/me, rtr-ids stats, B-53/54/55/56/63 ported in the second commit)
- [x] **1.2** Compare, #569 access and the signed-in match history read (#850)

## Phase 2: Admin

- [x] **2.1** Characterize + port Admin lists and views

## Phase 3: Queue

- [x] **3.1** Characterize + port club and session reads (club, invite, venues, inventory, license, players, sessions, roster, matches, cost, payments, results, requests, done-review; `/finalization` left, see deviations)
- [x] **3.2** Sync read (`/api/sync`, `/api/sessions/{id}/sync`)

## Phase 4: Switch

- [~] **4.1** (prefix list decided and documented; manual per-app check not run) Add this track's `/api/*` prefixes to the `ROTRA_GO_MOVED_AREAS` list (local now; the beta project gets the full list in staging-verification; remove a prefix to undo); manual check per app, locally

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
| 2026-11-19 | 2.1 | A read-mode Admin pass does not check the session row, so a revoked admin session still reads 200 | `ModeRead` by design; switching to `ModeWrite` is an auth decision | Owner to decide (R2: only an active admin can read) |
| 2026-11-19 | 2.1 | An inactive or unknown admin answers 401 `unauthenticated` (TS: 403 `wrong_account`) | Go auth middleware | Owner to confirm |
| 2026-11-19 | 2.1 | Malformed ids answer 404 where the TS crashes with 500 | Go validates ids first | Pinned in a Go test |
| 2026-11-19 | 2.1 | Go role needs EXECUTE on `rotra_sales_*` and SELECT on the sales views and `admin_settings` | Migration revokes them from PUBLIC | Grant before switching `/api/sales` |
| 2026-11-19 | 2.1 | `internal/rules/{sales,adminplayer,...}` are stubs; helpers live unexported in `signedin` | Rules packages not to be edited here | Move later (a copy) |
| 2026-11-19 | 2.1 | `GET /api/players` has no query parameters in the TS, so none added | Characterized | Client filters |
| 2026-11-19 | 3.1 | A disabled or unprovisioned club answers 401 (TS: 403 `wrong_account`); malformed ids answer 404 (TS: 500) | Go auth middleware and id validation | Owner to confirm |
| 2026-11-19 | 3.1 | `GET /api/club` and `/api/club/invite` write on a read (fill a missing invite code, `revision + 1`) | Characterized from the TS | Go role needs UPDATE on `clubs`; pinned |
| 2026-11-19 | 3.1 | `/requests` filters stale requests without closing them in the database | Reads should not write | Same answer, stored status not updated |
| 2026-11-19 | 3.1 | `/finalization` runs `driveFinalizationJobs` before reading; `/done-review` needs `sessionCompleteness` from sync | Not a plain read | Left out; `/finalization` is an owner call, `/done-review` follows 3.2 |
| 2026-11-19 | 3.1 | `/api/public-sessions/{slug}/my-request` is a visitor read keyed on a receipt cookie | Not a club read | Stays on Next; `/api/public-sessions` cannot be moved as a whole prefix |
| 2026-11-19 | 3.1 | `internal/rules/{sessioncost,payment}` are empty stubs; helpers are unexported in `signedin/queue_money.go` | Rules not edited here | Move later |
| 2026-11-19 | 3.2 | The two sync reads make no entitlement check (TS has none); `done-review` ignores `record_games` (TS does) | Characterized | Ported as is, pinned |
| 2026-11-19 | 3.2 | `incompleteSessionIds`, `belowMinimum` and guest candidates have no ORDER BY, as in the TS | Characterized | Production order not guaranteed |
| 2026-11-19 | 3.2 | `normalizedName` hand-ports JS `toLocaleLowerCase` (dotted I, final sigma); captured on an en-US machine | No Go equivalent | Pinned in golden |
| 2026-11-19 | 4.1 | Only prefixes with no write route left are listed (B-60): Queue `/api/license,/api/sync,/api/players`; Player `/api/leaderboard,/api/rtr-ids,/api/invites,/api/players`; Admin `/api/audit-events,/api/sales,/api/license-operations` | `ROTRA_GO_MOVED_AREAS` forwards every method | The rest move with go-writes-admin-player and go-writes-queue; listed in docs/architecture.md |
| 2026-11-19 | 4.1 | No manual per-app check run; the list is documented, not applied to any deployment | The beta project gets the full list in staging-verification; the local sign-in check needs the app-side pass wiring | Done in staging-verification |
| 2026-11-19 | 4.1 | `GET /api/sessions/{id}/finalization` not ported | Runs `driveFinalizationJobs` before reading | Owner call |
