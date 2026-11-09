# The own profile has a Your clubs card with Leave club and Report a problem

Status: NEW
Date: 2026-11-09
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Own profile › Your clubs, Leave club sheet
Route: /player/players/u1
Screen ID: P-OWN-PROFILE
Artifact: none
Components: avatar, club-logo, confirm-sheet, button, notice (new: player-clubs-card)
Supersedes: none
Superseded by: none

## What changed
- Before: the player could not see which clubs they belong to.
- After: a **Your clubs** card under Your account (own profile only). One row per club: initials or logo, name, a muted line ("Joined via club link", "Joined via session link" or "Added by the club"), and **Leave club** and **Report a problem**. Leave club opens a confirm sheet; Report a problem opens an email to a placeholder support address with the subject "Problem with <club>" and the club name and player ID in the body. Hint: "Opens your email app." Migs has two sample clubs.

## Why
- Owner decision D-2026-11-09-06: Your clubs shows on the player's own profile only, with Leave club (removes them from the club's Saved players; past games stay) and Report a problem for each club. The support address `support@rotra.example` is a placeholder the owner supplies before the real-app ticket ships.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Two clubs; Leave club sheet; after leaving (row gone, toast "You left <club>"); no clubs ("You're not in any club's saved players yet.").
- Copy: Your clubs; Joined via club link; Joined via session link; Added by the club; Leave club; Report a problem; "Opens your email app."; "Leave <club>?"; "You're removed from the club's saved players. Your past games stay."; Cancel
- Tokens: none (existing tokens only; rows use `--elev`, `--border`, `--accent`)
- Known differences: none

## Reuse plan
- Reuses as is: `avatar/`, `club-logo/`, `confirm-sheet/`, `button/`
- Extends: none
- New: `player-clubs-card/` — the list of clubs with the two actions; nothing existing fits
- Shares work with: 2026-11-09-player-my-sessions.md, 2026-11-09-player-registration-from-links.md

## Docs updated
- Business logic: identity/README.md — club membership, Leave club, Report a problem
- Database design: identity.md — `club_players.joined_via`
- Screen docs: profile.md (P-OWN-PROFILE)

## Real app work
- Add `player-clubs-card` to `@rotra/ui`; Leave club removes the player's `club_players` row for that club; Report a problem is a `mailto:` link with the owner's support address.
