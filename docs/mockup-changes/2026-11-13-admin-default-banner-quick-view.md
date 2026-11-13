# Admin: Quick view becomes the banner profile card with stats; Admin picks the default banner

Status: IN MOCK APP — #814
Date: 2026-11-13
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Players › Quick view (playerManagementSheet 'Quick view') and Settings › Profile banners (viewBanners)
Route: /admin/players (click a row); /admin/settings/profile-banners
Screen ID: A-PLAYERS (Quick view), A-BANNERS
Artifact: https://claude.ai/artifact/1Au5cHUNCeZJ3JQNPWXsXz
Components: player-quick-view, profile-banner, banner-library-tile
Supersedes: none
Superseded by: none

## What changed
- Quick view header: a tinted row with a 56 px picture → a banner card like the Queue and Player profile dialogs: the player's banner (5:2 art, 84 px tall), the picture (72 px) overlapping it with a ring, then the name and the rank and Registered/Unclaimed chips. Unclaimed players and players with no pick show the default banner.
- Quick view: a **Stats · 2026** box (the current year; Games, Wins, Losses, Win rate, 2 × 2; “No games yet this year”; resets on January 1) after the ID / Phone / Email / Socials list, from the same games as History. History and the footer are unchanged.
- Profile banners: one shown banner carries a green **Default** chip under its tile (Court at first); every other shown banner has a ghost **Make default** button; hidden banners show neither. Make default applies at once: toast “NAME is now the default banner.” with **Undo**, Record of actions “Made NAME the default banner (was NAME).”. Clicking (hiding) or deleting the default is refused: “This is the default banner. Make another banner the default first.” The helper line adds “The **Default** banner shows on every profile that hasn't picked one, and on guests and unclaimed profiles.”

## Why
- Owner, November 13, 2026: “Queue app should see the Profile with standings ( win rate and statistics ) same with admin app · and the default banner image should be controllable via admin control”. Decision [D-2026-11-13-03](../mvp/decisions.md#d-2026-11-13-03).
- Follow-up, same day: “can we make the stats to only reset every year”. Profile stats now count the calendar year and reset on January 1; the rank keeps its 90-day window.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Quick view for a registered player with a banner, a registered player with no pick (default), an unclaimed player (default banner, Invite row); Profile banners with Court as default, after Make default on another banner, Undo, refusal toasts on hiding/deleting the default, offline (the offline error, nothing changes).
- Copy: “Default”; “Make default”; “NAME is now the default banner.”; “This is the default banner. Make another banner the default first.”; tile title “The default banner. Make another banner the default before hiding this one.”; Record of actions “Made NAME the default banner (was NAME).”; “Stats · 2026” and “No games yet this year” as in Queue.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: chip (ok), button (xs ghost), toast with Undo; the stats block from the participant profile card.
- Extends: player-quick-view — header becomes the banner card; banner-library-tile — a default slot (chip or Make default).
- New: none
- Shares work with: 2026-11-13-queue-profile-stats-banner.md, 2026-11-13-player-default-banner.md

## Docs updated
- Business logic: business_logic/product/admin/modules/configuration/README.md — Default banner rule; business_logic/product/player-information/modules/identity/README.md — default comes from Admin; business_logic/product/open-decisions.md — note on the change.
- Database design: database_design/product/admin/modules/configuration-requests.md — proposed `profile_banners.is_default` with a partial unique index; database_design/product/open-decisions.md — note.
- Screen docs: screens/product/modules/admin/configuration.md (A-BANNERS), screens/product/modules/admin/players-requests.md (Quick view).

## Real app work
- Migration for `profile_banners.is_default` (ask first: migration); Admin service and route for Make default; refuse hide/delete of the default; Quick view banner card and stats; every banner read resolves null to the default.
