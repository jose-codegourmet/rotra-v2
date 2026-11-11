# Guests and unclaimed profiles stay in their club; Player Information search shows registered players only

Status: IN MOCK APP — #757
Date: 2026-11-11
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Add player sheet (Saved players and Player Information tabs), Saved players list, player profile sheet, Edit details, Invite sheet, history "ROTRA profile" filter
Route: /queue/sessions/s-tonight/preparation (Add player) and /queue/players (Saved players)
Screen ID: Q-ROSTER, Q-IDENTIFY, Q-SAVED-PLAYERS
Artifact: none
Components: add-player-sheet, saved-player-card, player-profile-sheet, invite-sheet, identity-chip
Supersedes: none
Superseded by: none

## What changed
- Player Information search: the unclaimed directory result (Leo Pascual) is gone. Search shows registered players only.
- Unclaimed saved players have no RTR ID. Under their name, lists show "Not registered yet" (guests still show "Guest").
- The **Confirm player** identity step (RTR ID matches / Scanned their QR / Phone confirmed) is removed. Any pick with a level is added in one tap; with no level, the level step opens. The sheet is always titled "Add player".
- Player profile sheet: the unclaimed status reads "Saved by your club with a phone. Not registered with ROTRA yet"; RTR ID reads "Given when they register".
- Invite sheet (unclaimed): "Your club saved them with a phone. This link lets them turn that record into a ROTRA account with their phone and email, …"
- Phone hints (New player, Edit details): ROTRA now links them only to a registered account. "Only your club sees them otherwise."
- History filter "ROTRA profile": only registered players count as "Has a ROTRA profile".

## Why
- Owner, November 11, 2026: "guest should stay in the club's saved players and registered players live in rotra's saved players", "Unclaimed profiles should never be found in other clubs. they should only live in club". Owner choices: same phone in two clubs → keep separate; RTR ID only on registration; on registration the records link automatically. See [D-2026-11-11-03](../mvp/decisions.md#d-2026-11-11-03).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Player Information search with results, no match and offline; Saved players tab with an unclaimed player (Gab Torres); a pick with a level (one tap) and with no level (level step); profile sheet and invite sheet for an unclaimed player.
- Copy: "Not registered yet"; "Saved by your club with a phone. Not registered with ROTRA yet"; "Given when they register"; "Your club saved them with a phone. This link lets them turn that record into a ROTRA account"; "Without a phone they're saved as a guest. With one, ROTRA can link them to their account if they're registered, when the session syncs. Only your club sees them otherwise."; "With a phone, ROTRA can link them to their account if they're registered, when it syncs."
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: identity-chip — unchanged labels.
- Extends: add-player-sheet — drop the identity-check block and its disabled primary; saved-player-card, player-profile-sheet — the "Not registered yet" / "Given when they register" lines for an unclaimed player with no RTR ID; invite-sheet — new unclaimed copy.
- New: none
- Shares work with: none

## Docs updated
- Business logic: `queue/modules/players/README.md` (search is registered only; identity check withdrawn), `player-information/modules/identity/README.md` and `flow/claim-and-recover.md` (club-only unclaimed, RTR ID on registration, automatic linking), `docs/product-terms.md`.
- Database design: `player-information/modules/identity.md` — proposed club-only storage for unclaimed profiles; migration left open.
- Screen docs: `screens/product/modules/queue/players-roster.md` (Player Information tab, confirmation card, Q-IDENTIFY withdrawn), `screens/product/coverage.md`.

## Real app work
- `packages/ui`: the add-player-sheet, saved-player-card, player-profile-sheet and invite-sheet changes above.
- `packages/data` fixtures and mock store: unclaimed players without RTR IDs; the directory without unclaimed profiles; no identity check.
- `packages/db` (real mode): `searchPlayerDirectory` filters to claimed profiles; `resolveClubPlayerIdentity` links only to claimed players and stops creating unclaimed `players` rows and RTR IDs; registration allocates the RTR ID and links every club's matching record. Waits on the open items in the decision (existing data migration, Admin view, unverified-phone risk).
- Not in this log: the Admin mockup still lists unclaimed profiles with RTR IDs (open in the decision).
