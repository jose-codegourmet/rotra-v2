# Queue, Player and Admin apps: ROTRA background art on the auth pages

Status: IN MOCK APP — #1081
Date: 2026-11-19
App: queue, player, admin
Mockup: `.login` styles in apps/mockup/queue-app/rotra-queue.html, apps/mockup/player-app/rotra-player.html and
apps/mockup/admin-app/rotra-admin.html (every view rendered in `<main class="login">`)
Route: /queue/login · /player/login, /player/forgot-password, /player/reset-password/<token> and the other Player pages in
the login frame (invite and Google pages) · /admin/login
Screen ID: Q-LOGIN, P-LOGIN, P-FORGOT, P-RESET (and the Player invite and Google pages in the same frame), A-LOGIN
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh, https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN,
https://claude.ai/artifact/1Au5cHUNCeZJ3JQNPWXsXz
Components: auth page frame
Supersedes: none
Superseded by: none

## What changed
- Before: the auth card sat centred on the plain page background.
- After: each app's auth pages sit on full-bleed Higgsfield art (gpt_image_2_6, rotra.club flat vector style, near-black,
  dark greens, neon mint):
  - **Queue:** Rion, the Queue Master, courtside with his glowing tablet under the court lights.
  - **Player:** Tara in a ready stance on court, the shuttle in the air.
  - **Admin:** an empty arena of courts seen from above, a few lit mint.
- **Layout:**
  - Wide screens (900 px and wider): the art fills the page with the subject on the left; the form card sits on the
    calm right side over a dark fade, with a deeper shadow.
  - Phones: the art is darkened behind the centred card.
- The art is the same in both themes, and the card keeps the theme's surface. The forms, copy and fields are
  unchanged.

## Why
- Owner, November 19, 2026, in the session: “please update the auth pages for Admin, Player and Queue apps; use
  higgsfield to create backgrounds that match rotra”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Queue club login; Player sign in, forgot password, reset password, invite and Google pages; Admin sign in and
  session-ended.

## Copy
- None.

## Open
- None.

## Docs updated
- screens/product/modules/queue/access-home.md (Q-LOGIN), player-information/access-registration.md (P-LOGIN),
  admin/access-navigation.md (A-LOGIN).
