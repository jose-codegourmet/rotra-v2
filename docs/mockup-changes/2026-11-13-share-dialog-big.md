# Share dialogs: big, full-size images, pick several, full-screen view

Status: NEW
Date: 2026-11-13
App: player, queue, admin
Mockup: apps/mockup/player-app/rotra-player.html › SHEETS.share, shPick, shViewer, downloadShare; apps/mockup/queue-app/rotra-queue.html › SHEETS.shareFinish, SHEETS.shareBoard, shPick, shViewer; apps/mockup/admin-app/rotra-admin.html › shareProfileSheet, shPick, shViewer
Route: every Share button
Screen ID: share dialog (Player Share; Queue Share your finish, Share profile, Share leaderboard; Admin Share profile)
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ, https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh, https://claude.ai/artifact/1Au5cHUNCeZJ3JQNPWXsXz
Components: share-dialog, share-image-picker, share-image-viewer
Supersedes: 2026-11-13-share-dialog.md (size tiles), the image picker in 2026-11-13-share-leaderboard.md
Superseded by: none

## What changed
- Before: a 560–820 px dialog with three small scaled previews (about half size, hard to read); tapping one chose the single size to download.
- After: the dialog is up to 1180 px wide (full width on phones) and shows each image at full size (Story 270 × 480, post 320 × 400, square 320 × 320), wrapping. Tapping an image picks or unpicks it (accent border, check badge on the top-left corner); all start picked; “N of M picked · Pick all / Clear”. Hover shows an eye button (always visible on touch) that opens the image full screen on a black backdrop, scaled to fit, with its name and Download; Esc, × or the backdrop closes it. Download N images and Share act on the picked images, disabled with none. Share leaderboard keeps its size switch and pages.
- Unchanged: OR divider, link field with the copy icon, card content.

## Why
- Owner artifact comment, November 13, 2026: “make the share dialogs big · make sure the photos are legible and not scaled down · each photo can be clicked and when hovered shows an eye icon which they can full screen · if they select on the photo they can multi click and download selected”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: all picked, some picked, none picked (buttons disabled); full-screen view of each size; touch (eye always shown).
- Copy: “Tap an image to pick it; the eye shows it full screen.”, “N of M picked”, “Pick all”, “Clear”, “Download N images”, “View NAME full screen”.
- Tokens: the viewer backdrop and eye button use fixed dark overlays like the photo viewer.
- Known differences: none

## Reuse plan
- New: share-image-picker (image, check badge, eye button, caption) and share-image-viewer, shared by every share dialog.
