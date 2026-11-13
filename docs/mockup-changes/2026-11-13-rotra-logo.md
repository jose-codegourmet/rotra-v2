# The ROTRA logo replaces the text wordmark

Status: NEW
Date: 2026-11-13
App: queue, player, admin
Mockup: LOGO, rotraLogo(), rotraLogoDark() and `.rlogo` styles in apps/mockup/queue-app/rotra-queue.html, apps/mockup/player-app/rotra-player.html, apps/mockup/admin-app/rotra-admin.html
Route: every page (top bar), sign-in pages, share images, Session QR card
Screen ID: top bar, sign-in, share images, Session QR
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh, https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ, https://claude.ai/artifact/1Au5cHUNCeZJ3JQNPWXsXz
Components: rotra-logo (new), app-top-bar, sign-in, share-card, session-qr-card
Supersedes: the “ROTR**A**” text wordmark
Superseded by: none

## What changed
- Before: “ROTRA” typed in bold with a green “A” in the top bars, on the sign-in pages, and at the foot of share images and the Session QR card.
- After: the real logo artwork (docs/branding/materials/logo). Top bars: the Full logo, 26 px tall, next to the app name (Queue / Players / Admin); on phones 420 px and narrower the Mini symbol only. Sign-in pages: the Full logo, 52 px. The theme picks the artwork: Dark files in the dark theme, Light files in the light theme (and with the system setting). Share images and the Session QR card are fixed dark, so they always use the Full Dark logo (20 px / 18 px). Accessible name “ROTRA”.
- Unchanged: layout, “Run the game.” tagline, the app names next to the logo.

## Why
- Owner, November 13, 2026: “can you please apply the correct logo branding” with the four files Small Light BG, Small Dark BG, Full Light BG, Full Dark BG.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: top bar (full and phone mini), sign-in, every share image size, Session QR card, both themes.
- Copy: none (accessible name “ROTRA”).
- Tokens: the logo uses its own greens from the artwork.
- Known differences: Player's downloaded share PNG (canvas) still draws the text mark; drawing the SVG into the canvas is part of the ticket.

## Reuse plan
- New: rotra-logo component (variant full / mini / responsive, theme aware, and a fixed-dark variant), used by every app.
