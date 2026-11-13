# Player: the default banner comes from Admin; always-private players keep their own banner; stats count the calendar year

Status: IN MOCK APP — #814
Date: 2026-11-13
App: player
Mockup: apps/mockup/player-app/rotra-player.html › profile card dialog (SHEETS.profileCard), profile hero
Route: /player/clubs/<club> (tap a member); /player/u/<id>
Screen ID: P-PROFILE, D-PARTICIPANT-PROFILE
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: profile-banner, participant-profile-card
Supersedes: none
Superseded by: none

## What changed
- A player with no pick shows the default banner Admin sets (Court in the prototype) instead of a hard-coded Court.
- The profile card for a player hidden from the viewer (private, always private) showed Court → it shows that player's own banner, as the identity rules say (“the picture and banner stay public”).
- Profile card **Stats · last 90 days** → **Stats · 2026** (the current calendar year, reset on January 1); empty “No games yet” → “No games yet this year”. Share profile: **Last 90 days** → **In 2026**, empty “No games yet this year”. The rank still uses the 90-day window.

## Why
- Owner, November 13, 2026: “the default banner image should be controllable via admin control”. Decision [D-2026-11-13-03](../mvp/decisions.md#d-2026-11-13-03).
- Follow-up, same day: “can we make the stats to only reset every year”. Profile stats now count the calendar year and reset on January 1; the rank keeps its 90-day window.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: own profile with no pick; another player's card with a pick; a private / always-private player's card (their banner).
- Copy: “Stats · 2026”, “In 2026” (both the current year), “No games yet this year”.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: profile-banner.
- Extends: none
- New: none
- Shares work with: 2026-11-13-queue-profile-stats-banner.md, 2026-11-13-admin-default-banner-quick-view.md

## Docs updated
- Business logic: business_logic/product/player-information/modules/identity/README.md — default comes from Admin.
- Database design: see the Admin log (`profile_banners.is_default`).
- Screen docs: screens/product/modules/player-information/profile.md, README.md and ranking-history.md (stats and Share card year); screens/product/dialogs.md (D-PARTICIPANT-PROFILE). Business: player-information README and ranking README. Database: identity.md (Share card wins this year).

## Real app work
- Resolve a null `banner_id` to the Admin default; send the hidden player's banner on the masked card; profile and Share stats count from January 1 (Asia/Manila) instead of the last 90 days.
