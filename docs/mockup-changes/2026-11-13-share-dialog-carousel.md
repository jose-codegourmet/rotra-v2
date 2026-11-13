# Share dialogs: compact carousel

Status: NEW
Date: 2026-11-13
App: queue, player, admin
Mockup: `.sh-dlg .sh-tiles`, `.sh-car-nav`, SHCAR / shCarInit / shCarSync in apps/mockup/queue-app/rotra-queue.html, apps/mockup/player-app/rotra-player.html, apps/mockup/admin-app/rotra-admin.html
Route: every Share button except the session and club invites
Screen ID: share dialog
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh, https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ, https://claude.ai/artifact/1Au5cHUNCeZJ3JQNPWXsXz
Components: share-image-picker (carousel)
Supersedes: the wrapping 1180 px layout in 2026-11-13-share-dialog-big.md
Superseded by: none

## What changed
- Before: a dialog up to 1180 px wide with the full-size images wrapping onto rows.
- After: at most 680 px wide (full width on phones). The full-size images sit in one horizontal strip, an Embla-style carousel: drag with the mouse or swipe on touch, scroll-snapping each image to the centre; images stay clickable (pick/unpick) and a drag never counts as a click; the eye still opens full screen; the strip keeps its position when the dialog re-renders; a fade mask shows on a side only when more images are hidden that way; dots under the strip mark the centred image.
- Unchanged: images, picking, Download / Share, OR and the link field.

## Why
- Owner artifact comment, November 13, 2026: “make the share dialog more compact and a bit narrow by making the image in a form of embla carousel (draggable and clickable) · put a mask on the sides if there are more items to the sides”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: start (right mask), middle (both masks), end (left mask), everything fits (no mask); drag vs click; touch swipe.
- Copy: none
- Tokens: none
- Known differences: the real app may use Embla Carousel itself; adding it is a new dependency and needs a decision (AGENTS.md rule 11). The mockup uses native scroll-snap.

## Reuse plan
- Extends share-image-picker with the carousel strip.
