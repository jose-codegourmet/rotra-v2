# Track specification: Signed-in reads in Go

**Track ID:** go-signed-in-reads_20261113 · **Type:** refactor · **Priority:** high (order 7 of 13) · **Created:** 2026-11-13
**Depends on:** go-sign-in, go-public-reads · **Decisions:** B-01 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

Moves every remaining GET once sign-in exists, so screens read from Go before writes move.

## Requirements

### R1: Player reads

`/api/me/*`, account, my clubs, my sessions, player compare, signed-in public-session access (#569), and the signed-in match history of a finished session (`GET /api/public-sessions/{slug}/match-history`, `readPublicMatchHistory`, added to the Player app in #850 after this track was written).

**Accepted when:**

- [ ] Characterization tests pass; own-data rules enforced
- [ ] Match history: `null` until the session is completed; only the Player's own matches until the club shares the results; only the paired Queue origin may call it

### R2: Admin reads

Clubs, players, sales views, audit events, contact-change and password-reset request lists, feature flags, ranking settings.

**Accepted when:**

- [ ] Only an active admin can read

### R3: Queue reads

Club, players, sessions (roster, matches, queue, cost, payments, results), inventory, venues, license, join requests, sync read.

**Accepted when:**

- [ ] Club scope and entitlement checks match `@rotra/db/service/authorize`

## Carried in from settled decisions

Fixes to the public reads, decided on November 18, 2026 ([backend decisions](../../../docs/backend/open-decisions.md#settled)). Each one changes the TypeScript and Go together and updates the golden cases in `apps/api/internal/publicreads/testdata/`.

- **B-53:** a private or always-private RTR ID answers 404 to a caller who is not signed in. A player hidden from Player Information answers 404 to every caller.
- **B-54:** one server-side masking rule for leaderboard, profile, rank and games; `/rank` gets the approved-algorithm gate; `/games` is paged.
- **B-55:** the public club read sends no invite code; masked members carry no level and no stable key. The Join button change starts in the mockup first.
- **B-56:** published results on the public session page mask private and always-private players.
- **B-60:** list `/api/leaderboard`, `/api/players` and `/api/rtr-ids` in `ROTRA_GO_MOVED_AREAS` once their signed-in siblings are in Go.

## Carried in from main (merged November 18, 2026)

The TypeScript reads changed on `main` after go-public-reads was completed (Epics P12 to P15 and the period leaderboards). The Go reads in `apps/api/internal/publicreads` still follow the older behavior. Each item ports the new behavior and updates the golden cases in `apps/api/internal/publicreads/testdata/`.

Already-ported reads that changed:

- **Leaderboard ([D-2026-11-16-05](../../../docs/mvp/decisions.md#d-2026-11-16-05)):** `/api/leaderboard` and `/api/leaderboard/search` take `period` (annual, monthly, weekly) and rank by wins from recorded match facts (`readPeriodLeaderboard`). Search is now per viewer. `/api/leaderboard/me` is a signed-in read.
- **Profile and RTR ID ([D-2026-11-16-04](../../../docs/mvp/decisions.md#d-2026-11-16-04)):** `/api/players/{playerId}` and `/api/rtr-ids/{rtrId}` read the viewer (`readVisibleProfile`). An unclaimed player saved by one club shows that club's name and nickname for them and `unclaimedSavedBy`. The profile carries `leaderboardPlaces`.
- **Public session page:** an unclaimed player with an open shared entry is shown in full, with the club's own name and nickname.
- **Year game stats by RTR ID** (`GET /api/rtr-ids/{rtrId}/stats`, not in Go yet): an unclaimed player's games come from every club record under their shared entry.

New signed-in reads:

- `GET /api/me/notifications`, `GET /api/me/notifications/unread-count` ([D-2026-11-16-03](../../../docs/mvp/decisions.md#d-2026-11-16-03)).
- `GET /api/me/verification` and Admin `GET /api/players/{playerId}/verification` ([D-2026-11-16-02](../../../docs/mvp/decisions.md#d-2026-11-16-02)); `/api/me/account` now carries the Google identity fields.
- `GET /api/invites/{clubId}` (P-INVITE and where a signed-in player stands on a session).
- Queue and Admin player lists: lookup by exact RTR ID or email, the four player statuses, club nickname.

**Settled by [B-63](../../../docs/backend/open-decisions.md#settled) (November 19, 2026):** the profile read (`readPublicProfile` and `readVisibleProfile`, behind `/api/players/{playerId}` and `/api/rtr-ids/{rtrId}`) answers as follows, and Go ports exactly this. Always private, any caller but the owner: the masked profile with an empty `leaderboardPlaces` on the profile route; `404` on the RTR ID route; `403` on Compare. Private and not signed in: `401` on the profile route, `404` on the RTR ID route. Unclaimed under more than one club and not signed in: `401` on the profile route, `404` on the RTR ID route. The TypeScript side is on `go-stack` only until it merges into `main`. Still to do here: B-53's `hidden_from_directory` 404 and B-54's trimmed masked body.

## Scope

**In:** All signed-in GET routes.

**Out:** Writes.

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
