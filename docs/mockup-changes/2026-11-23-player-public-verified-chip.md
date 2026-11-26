# The public profile shows whether a registered player is verified

Status: IN MOCK APP — #1038
Date: 2026-11-23
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Profile (another player's), chip under the name
Route: /players/[playerId]
Screen ID: P-PUBLIC-PROFILE
Artifact: none
Components: profile hero (player-profile-card), status chip
Supersedes: none
Superseded by: none

## What changed
- Under the name on another player's profile: **✓ Verified** (accent chip) or **Not verified** (neutral
  chip) for a registered player, to visitors and signed-in players. Before: no verification shown to others.
- Only the result is public: no step count, no missing steps; Verified by Admin reads **Verified**.
- Unclaimed players keep **Not registered yet** and no verification chip. The own profile is unchanged
  (**This is you** + the full status chip that opens Verification).
- Mock data: some seeded registered players are verified so both chips show.

## Why
- Owner, November 23, 2026: "also show it in their player profile" (D-2026-11-23-07). Settles the open item
  "whether others see the badge" of D-2026-11-16-02.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: verified, not verified, unclaimed (no chip), own profile (unchanged).
- Copy: "Verified", "Not verified".
- Tokens: none.
- Known differences: none

## Docs updated
- Business: player-information/modules/identity/README.md, open-decisions.md
- Screens: player-information/profile.md
- Database: none
- Terms: product-terms.md (Verified)
- Decisions: D-2026-11-23-07, note on D-2026-11-16-02

## Real app work
- #1038: `PlayerProfile.verified` (mock and the Prisma public profile read; a boolean only) and
  `PublicVerificationChip` in `PlayerIdentityCard`. No migration.
