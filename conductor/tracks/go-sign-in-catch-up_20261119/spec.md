# Track specification: Google sign-in and the guest claim in Go

**Track ID:** go-sign-in-catch-up_20261119 · **Type:** feature · **Priority:** high (order 10 of 14) · **Created:** 2026-11-19
**Depends on:** go-sign-in · **Decisions:** [D-2026-11-16-01](../../../docs/mvp/decisions/2026-11-16.md#d-2026-11-16-01), [D-2026-11-18-01](../../../docs/mvp/decisions/2026-11-18.md#d-2026-11-18-01), [D-2026-11-16-04](../../../docs/mvp/decisions/2026-11-16.md#d-2026-11-16-04), [D-2026-11-18-07](../../../docs/mvp/decisions/2026-11-18.md#d-2026-11-18-07), B-62 ([backend open decisions](../../../docs/backend/open-decisions.md))

## Why

[go-sign-in](../go-sign-in_20261113/spec.md) was built and merged before two sign-in changes landed on `main`: Google sign-in for players, built on Supabase Auth, and a guest's invite link that claims the guest's record. Go has neither. They were first written into the go-sign-in spec as carried-in work; that track is done apart from its staging rehearsal (5.2), so the work has its own track. Nothing here is sized yet.

## Requirements

### R1: Google sign-in for players in Go

Google sign-in ([D-2026-11-16-01](../../../docs/mvp/decisions/2026-11-16.md#d-2026-11-16-01)) is behind the `player_google_sign_in` flag, which starts off ([D-2026-11-18-01](../../../docs/mvp/decisions/2026-11-18.md#d-2026-11-18-01)). What `main` has and Go does not:

- **Routes with no Go counterpart:** `/api/auth/google/start`, `/callback`, `/outcome`, `/link`, `/unclaimed`, `/api/claim/{token}/google`, `/api/register/{clubId}/google`.
- **Tables:** `player_accounts.google_email` and `google_linked_at` (migration `20261118000200_player_google_sign_in`). The account import (go-sign-in R6) moves password logins only; a login that exists only as a Google identity in Supabase has nothing to import.
- **Session:** a session started by Google is only valid for a player with Google connected (`startedWithOAuth`, `loadAccountContext`). After the deadline a player with no Google account is refused on most Player routes (`googleRequiredFor`), and the Player `proxy.ts` redirects to `/connect-google`. The Go pass check in the apps (go-sign-in R7) has neither rule.
- **Claim:** `completeClaim` accepts a Google subject in place of a password, and registration adopts the RTR ID of an open shared entry with the same email ([D-2026-11-16-04](../../../docs/mvp/decisions/2026-11-16.md#d-2026-11-16-04)).
- **Open in the decision:** the deadline date, and whether the password still works after it.

**Accepted when:**

- [x] The open points in D-2026-11-16-01 are answered, or the owner decides the Go stack ships without Google sign-in while the flag is off (2026-11-22: ships without it)
- [x] If built (not built; n/a): every route above has a Go counterpart with characterization tests, and the Go pass check in the apps (go-sign-in R7) has the Google session and deadline rules

### R2: A guest's invite link

[D-2026-11-18-07](../../../docs/mvp/decisions/2026-11-18.md#d-2026-11-18-07) (#966; approved, details open): the invite link made for a guest (a club record with a name only: no email, phone or shared entry) is that guest's own registration link. Registering through it sets `club_players.player_id` on that same row, so the record with its roster entries and games becomes the player's; the person types their own email and phone.

- **Redeeming the link is already in Go** (`apps/api/internal/auth/claim`). Jose checked it by reading the code in `877c5e45` (#967): the record-link path already takes the person's own phone when the record has none, so no Go change was made. No Go test covers a name-only guest's link.
- **Issuing the link is TypeScript only** (`issueClaimLink`, a Queue write). Its port, including the guest case, belongs to [go-writes-queue](../go-writes-queue_20261113/spec.md), not here.

**Accepted when:**

- [x] A Go characterization test redeems a name-only guest's link and matches the TypeScript result
- [x] Any difference found is fixed in Go or logged as a deviation

## Scope

**In:** Google sign-in routes, session rules and claim with Google in Go; the guest-link redemption check.

**Out:** Issuing claim links (go-writes-queue); the staging rehearsal of the account import (go-sign-in 5.2); anything live on Railway or Supabase before staging-verification (B-52).

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
