# Players can make their profile private

Status: IN MOCK APP — #588
Date: 2026-11-09
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Privacy and contact, leaderboard, player profile, RTR ID search
Route: /player/profile/privacy-and-contact
Screen ID: P-PROFILE-PRIVACY
Artifact: none
Components: switch, leaderboard-row, leaderboard-list, profile-not-found, private-contact-card
Supersedes: none
Superseded by: none

## What changed
- Before: Privacy and contact had only the phone switch; every profile was public.
- After: a new **Profile visibility** section above Phone privacy with a **Private profile** switch (default off). For visitors who are not signed in, private players (and guests) are masked on the leaderboard and podium ("Jose Adrian" → "J*** A***", initials of the mask, row not clickable, not found by name search); their profile, games, rank and compare pages show a "Log in with ROTRA" gate with a Sign in button; their full RTR ID gives "Profile not found". Signed-in players see everything. Two sample players (positions 6 and 10) are private.

## Why
- Owner decision D-2026-11-09-07: "private means guests dont see their rotra profile".

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: public, private, Saving…, offline error; leaderboard row and podium masked; profile gate; RTR ID not found; signed-in viewer sees all.
- Copy: Profile visibility; Private profile; "Private means guests don't see your ROTRA profile. Signed-in ROTRA players still see it."; "Saved: your profile is public." / "Saved: your profile is private."; "Log in with ROTRA to see this profile."
- Tokens: none (existing tokens only).
- Known differences: none

## Reuse plan
- Reuses as is: `switch/`, `profile-not-found/`, `notice/`
- Extends: `leaderboard-row/` and `live-leaderboard/` (masked, non-interactive variant), `leaderboard-list/` (search skips masked rows), `private-contact-card/` (add the Profile visibility section)
- New: none
- Shares work with: 2026-11-09-player-previous-picture.md (same Player Information screens)

## Docs updated
- Business logic: docs/business_logic/product/player-information/modules/identity/README.md — visibility rule
- Database design: docs/database_design/product/player-information/modules/identity.md — `profile_private`
- Screen docs: identity-privacy.md (P-PROFILE-PRIVACY), profile.md (states), ranking-history.md (masking, RTR search)
