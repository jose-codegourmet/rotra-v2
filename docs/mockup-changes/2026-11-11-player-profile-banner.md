# Profile page: a public banner across the top of the profile card, like Discord

Status: NEW
Date: 2026-11-11
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Player profile (own and public) › left profile card
Route: /player/players/u1 (own), /player/players/b2 (someone else)
Screen ID: P-PROFILE, P-PUBLIC-PROFILE
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: profile-hero
Supersedes: none
Superseded by: none

## What changed
- Before: the profile card started with the picture and name side by side on a plain surface.
- After: a banner strip (accent gradient from the existing tokens) runs edge to edge across the top of the card; the 88 px picture overlaps its bottom edge with a surface-coloured ring, and the name and nickname sit beside the picture below the banner. Everything else on the card (Player ID, Edit profile / My player ID / Share profile, Compare) is unchanged. The same card is used for your own profile and for another player's public profile.

## Why
- Owner comment on the Player artifact, November 11, 2026, anchored on the profile card: "this part here should show a public banner like discord".

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: own profile (camera button on the picture, This is you chip), someone else's profile, photo / character / initials picture, long name wrapping under the banner.
- Copy: none changed.
- Tokens: none new (banner uses --accent-dim, --accent, --accent-subtle; ring uses --surface).
- Known differences: none

## Owner comment, November 11, 2026 (second)
- "since I am allowing a show banner in profile like discord — please add a corner for updating banner".
- Changed: Edit profile › Name gets a **Profile banner** row under the picture row: a small preview of the current banner (the default gradient or the uploaded image), **Upload banner** (image file, up to 4 MiB) and **Remove banner** when one is set. In the mock the upload applies at once with the toast **Banner updated**; **Remove banner** restores the default gradient with **Banner removed**. The profile card shows the uploaded image as the banner (centred, cover). The banner is public, like the picture.
- Copy added: **Profile banner**, **The strip across the top of your profile card, like a cover photo. Public. A wide image works best (about 3:1); up to 4 MiB.**, **Upload banner**, **Remove banner**, **Banner updated**, **Banner removed**, **Choose a banner smaller than 4 MiB.**
- Not decided: cropping and the exact stored size; a Supabase Storage path like profile pictures ([D-2026-11-08-03](../mvp/decisions.md#d-2026-11-08-03)) is the obvious home.

## Reuse plan
- Reuses as is: card, avatar
- Extends: profile-hero (banner strip, overlapping picture)
- New: none
- Shares work with: the Queue participant profile card (same banner treatment, #731 log)

## Docs updated
- none yet — proposal pending owner approval; screen docs follow when approved

## Real app work
- `@rotra/ui` ProfileHero: banner strip and overlapping avatar, optional banner image. EditProfileForm: banner row with upload and remove. `@rotra/data` `bannerUrl` on the player profile; real mode stores it in Supabase Storage next to profile pictures (new column, migration sign-off needed).
