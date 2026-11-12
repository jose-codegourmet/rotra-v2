# Clubs on every readable profile as logo-and-name links; Leave club on the club page; no Report a problem

Status: IN MOCK APP — #766
Date: 2026-11-12
App: player
Mockup: apps/mockup/player-app/rotra-player.html › P-PROFILE › Clubs card; P-CLUB-PAGE › .club-hero .club-acts
Route: /player/players/u1 (own, sign in as Migs), /player/players/b2 (someone else), /player/clubs/c1 (signed in as a member)
Screen ID: P-OWN-PROFILE, P-PUBLIC-PROFILE, P-CLUB-PAGE
Artifact: none
Components: player-clubs-card, club-page-hero
Supersedes: none
Superseded by: none

## What changed
- Your clubs on the own profile only → a Clubs card on every readable profile: **Your clubs** on the
  own profile, **Clubs** on another player's.
- Each club row had a logo, the name, the joined-via line and three buttons (Club page, Leave club,
  Report a problem) → one row that opens the club page: the club logo, then the name in bold, the
  muted joined-via line under it on the own profile only, and a chevron at the right.
- The "Report a problem opens your email app." hint and the placeholder support address are removed.
- Empty states: own "You're not in any club's saved players yet." (unchanged); another player's
  "No clubs yet."
- Club page hero: a signed-in viewer who is a current member sees **Leave club** (secondary button) in
  place of **Join this club**, next to Share club page. It opens the existing Leave confirm sheet
  unchanged; after leaving, Join this club returns.

## Why
- Owner (#766, November 12, 2026): "you should be able to see the other player's affiliated clubs",
  "the club box should be redesigned too", "it should be logo and then name", "leaving a club should be
  done in the club page not in the profile page", "please get rid of report a problem".

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: own with clubs, own empty, another player's with clubs, another player's empty, row hover
  and focus; club page hero for a member (Leave club) and for everyone else (Join this club); the
  Leave sheet pending and error as before.
- Copy: "Your clubs", "Clubs", "Joined via club link", "Joined via session link", "Added by the club",
  "You're not in any club's saved players yet.", "No clubs yet.", "Leave club", "Leave CLUB?",
  "You're removed from the club's saved players. Your past games stay.", "Cancel", "You left CLUB".
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: ClubLogo, ConfirmSheet, Button, Card, EmptyState, Icon.
- Extends: PlayerClubsCard — `isOwn`; rows become links; `onLeave` and `reportHref` removed.
- Extends: ClubPageHero — `onLeave` (Leave club in place of Join this club for a member).
- New: none
- Shares work with: none

## Docs updated
- Business logic: docs/business_logic/product/player-information — Clubs card, Leave club from the club page, no Report a problem
- Database design: none needed (no table change; the club page read gains `viewerIsMember`)
- Screen docs: profile.md (Clubs card), club-page.md (Leave club in the hero)

## Real app work
- PlayerClubsCard redesign; `usePlayerClubs` (mock + `/api/players/[playerId]/clubs`); club page
  `viewerIsMember` and Leave club in ClubPageHero; Report a problem code removed (#766).
