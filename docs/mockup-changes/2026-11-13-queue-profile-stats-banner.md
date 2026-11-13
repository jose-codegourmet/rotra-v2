# Queue profile dialogs: stats on the Queue Master's profile, and each player's own banner

Status: NEW
Date: 2026-11-13
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › profile dialog (SHEETS.profile) and session-page participant card (SHEETS.pubProfile)
Route: /queue/sessions/<live session>/console, tap any player on a court; /queue/s/<session> as a signed-in player, tap a participant
Screen ID: D-PARTICIPANT-PROFILE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: participant-profile-card, profile-banner
Supersedes: none
Superseded by: none

## What changed
- Queue Master's profile dialog: a **Stats · 2026** box (the current year) between **About** and **In your club**: Games, Wins, Losses, Win rate in a 2 × 2 grid, or “No games yet this year”. It's the same block the session-page participant card already had, now one shared piece. Both cards count the calendar year and reset on January 1 (was “Stats · last 90 days”).
- Both cards (and the guest / always-private variant): the banner was always the green Court gradient → it's the player's own banner (Court, Night, Dusk, Ember, Sun, Stripe). Guests, unclaimed profiles and registered players with no pick show the default banner (Court in the prototype; Admin sets it).

## Why
- Owner, November 13, 2026: “Queue app should see the Profile with standings ( win rate and statistics ) same with admin app · and the default banner image should be controllable via admin control”. Decision [D-2026-11-13-03](../mvp/decisions.md#d-2026-11-13-03).
- Follow-up, same day: “can we make the stats to only reset every year”. Profile stats now count the calendar year and reset on January 1; the rank keeps its 90-day window.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: registered player with games; player with no games (“No games yet”); guest; unclaimed; registered with each of the six banners; registered with no pick (default); session-page always-private and guest cards (banner only).
- Copy: “Stats · 2026” (the current year), “Games”, “Wins”, “Losses”, “Win rate”, “No games yet this year”.
- Tokens: none (the six banner gradients reuse the Player mockup's `bn-*` recipes over existing tokens).
- Known differences: none

## Reuse plan
- Reuses as is: the participant profile card's stats block — now also in the Queue Master's profile dialog.
- Extends: participant-profile-card — a `banner` key; profile-banner (shared with Player) for the six gradients.
- New: none
- Shares work with: 2026-11-13-admin-default-banner-quick-view.md, 2026-11-13-player-default-banner.md

## Docs updated
- Business logic: none needed (players README already lists Stats for the participant card).
- Database design: none needed for Queue (the banner comes from `players.banner_id` or the default).
- Screen docs: screens/product/modules/queue/players-roster.md — Full profile dialog lists the Stats box and the banner rule.

## Real app work
- Queue profile dialog: add the stats block (same data as the participant card, counted over the calendar year) and pass each player's banner to the card; resolve no pick to the Admin default.
