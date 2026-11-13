# Profile cards: no title bar, banner to the top edge, nickname first with a Copy RTR ID button

Status: IN MOCK APP — #814
Date: 2026-11-13
App: player
Mockup: apps/mockup/queue-app/rotra-queue.html › SHEETS.profile and SHEETS.pubProfile; apps/mockup/player-app/rotra-player.html › SHEETS.profileCard; apps/mockup/admin-app/rotra-admin.html › Players › Quick view
Route: /queue/sessions/<live session>/console (tap a player); /queue/s/<session> (signed in, tap a participant); /player/clubs/<club> (tap a member); /admin/players (click a row)
Screen ID: D-PARTICIPANT-PROFILE, A-PLAYERS (Quick view)
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: participant-profile-card, player-quick-view, sheet
Supersedes: none
Superseded by: none

One change across the three apps; logged under `player` because the owner's screenshot was the Player card.

## What changed
- Title bar: the dark header row with the player's name and × above the banner → gone. The banner starts at the card's top edge (Admin: the side panel's top edge) and ends at the middle of the picture (Queue/Player picture 64 px, top 52 px; Admin 72 px, top 48 px; banner 84 px). The × floats at the top right on a round translucent surface. The heading stays in the DOM, visually hidden, so the dialog keeps its accessible name.
- Name block, in order: **display name** (nickname, else full name) in bold 20 px; the full name under it in 14 px muted, only when there is a nickname; a small monospace button with the RTR ID and a copy icon. Was: the full name in bold with “nickname” in quotes beside it.
- RTR ID rows removed from **About** (Queue profile and participant card, Player card) and from Admin Quick view's details list (the ID row with Copy).
- The dialog's accessible name is the display name.
- Admin Quick view: the card box (border, rounded corners, raised background) → none; the banner runs edge to edge in the panel.

## Second pass (same day)
- Banner: 84 px tall → **5:2** of the card width (the owner's 2000 × 800 sample; 558 × 223 at 1280 px); the picture is centred on the banner's bottom edge (Queue/Player 64 px, margin −32 px; Admin 72 px, −36 px).
- Close ×: a translucent circle on the corner → a solid 32 px circle, `--surface` fill, `--border-strong` border, soft shadow, 16 px icon, 12 px from the top and right.
- RTR ID button: 28 px / 12 px → **tiny**: 22 px tall, 0 6 px padding, 11 px monospace in `--fg2` (`--fg` on hover), 12 px icon.
- Queue cards: the “Tonight · …” line under the chips → a **pill on the picture's bottom edge**, centred: 8 px dot + short label **Playing** / **Getting ready** / **Queued #N** / **Free** / **Away**; live pills use the accent, getting ready the warning colour. Hover or keyboard focus shows a tooltip to the right of the pill with the full line (“Tonight · Playing · Court 1”), also the pill's accessible name. No pill off the roster.

## Third pass (same day)
- Banner: the full 5:2 image (558 × 223 at 1280 px) → only its **top half**, a **5:1** strip (558 × 112): drawn banners use `background-size: 100% 200%` from the top; uploaded images `object-fit: cover` with `object-position: center top`. The picture stays centred on the strip's bottom edge. Owner, with a screenshot: “maybe crop the banner in half · from top to middle”.

## Seventh pass (same day): pill only while live
- The status pill shows only while the session is live: not on a prepared session, not after Session done (it had read “Free · 50 min” on a finished session). Owner, with a screenshot: “when game is done, the labels in the avatar should not show”.

## Sixth pass (same day): eye on the picture
- A profile card's picture that opens the full photo (Queue and Player cards, Admin Quick view) now shows, on hover and keyboard focus, a dimming circle (`--bg` at 55%) with a 26 px eye icon in `--fg` over it, fading in over 0.15 s. Initials have no viewer, so no eye. Owner, with a screenshot: “when you hover on the picture it should show an eye icon”.

## Fifth pass (same day): pill labels
- Pill text: **Playing** → **Playing in Court N**; **Getting ready** → **Waiting in Court N**; **Free** → **Free · N min** (minutes since their last match or check-in, the queue tiles' rest time), coloured like the queue tiles' wait: accent under 10 min, `--warn` from 10, `--error` from 16 (border and dot too); **Queued #N** and **Away** unchanged. The Free tooltip reads “Tonight · Free · waiting N min”. Owner, with a screenshot of the pill: “In Queue App, the labels will be · Free - Wait time (with colors) · Waiting in *Court Name* · Playing in *Court Name*”.

## Fourth pass (same day)
- Close ×: the base `.icon-btn` `min-width: 36px` made the 32 px button a 36 × 32 oval, and the solid dark fill with a shadow sat heavily on bright banners → a true **30 × 30** circle (`min-width: 0`, `aspect-ratio: 1`), frosted: `--surface` at 62% with `backdrop-filter: blur(8px)`, a 1 px border of `--fg` at 16%, no shadow, 14 px icon; hover `--surface` at 85%. Owner, with a screenshot: “can we please update this unproportioned and badly designed close button please”.

## Why
- Owner, November 13, 2026, with a screenshot of the Player card: “I want to add consistency to how names should be displayed · Nickname · if not then go with Full Name · and how a player card should be displayed is · no black background · banner starts from the edge or top of the card down to the half of the avatar · it should show the name in this order · Nickname ( or full name ) · fullname ( if there is nickname ) · copy rotra id . small button”. Scope answered: profile cards first; “no black background” is the title bar. Decision [D-2026-11-13-04](../mvp/decisions.md#d-2026-11-13-04).
- Second pass, same day, with screenshots: “rotra Id needs to be tiny · the close button looks bad · the banners should follow the aspect ratio of the image I uploaded · and I'd rather put the status in the avatar like below the avatar like pill or label and when they hover it shows what it is (show a tooltip)”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: pill for each status (Playing in Court N, Waiting in Court N, Queued #N, Free · N min at under 10, 10–15 and 16+ minutes, Away) with its tooltip on hover and focus; no pill off the roster; player with a nickname (two name lines); without a nickname (one line); with and without an RTR ID (no button for guests and unclaimed club records); masked cards (always private, guest; masked name only); copy success and clipboard failure (Player: “ID selected. Copy it from your device menu.”); long names wrap.
- Copy: “Copy RTR ID <id>” (accessible name, Queue/Admin), “Copy player ID <id>” (Player); toasts “RTR ID copied” (Queue/Admin), “Player ID copied” (Player).
- Tokens: none (the × background is `color-mix` of `--surface`).
- Known differences: none

## Reuse plan
- Reuses as is: button (xs), toast.
- Extends: sheet — a header-less mode where the × floats; participant-profile-card — name block (display name, full name, RTR ID copy button); player-quick-view — the same card, edge to edge.
- New: none
- Shares work with: 2026-11-13-queue-profile-stats-banner.md, 2026-11-13-admin-default-banner-quick-view.md, 2026-11-13-player-default-banner.md

## Docs updated
- Business logic: queue/modules/players/README.md (participant card); player-information/README.md (profile dialog).
- Database design: none needed.
- Screen docs: dialogs.md (D-PARTICIPANT-PROFILE); player-information/profile.md; queue/players-roster.md; admin/players-requests.md.
- Product terms: **Display name** added.

## Real app work
- One profile card component used by all three apps: header-less sheet with floating ×, banner to the top edge, display-name block with the RTR ID copy button; remove the RTR ID rows; Admin Quick view uses it edge to edge.
