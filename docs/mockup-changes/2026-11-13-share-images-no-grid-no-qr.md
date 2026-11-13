# Share images: no grid background, no QR

Status: NEW
Date: 2026-11-13
App: player, queue, admin
Mockup: apps/mockup/player-app/rotra-player.html › shareCardHTML, drawShareCard, SHEETS.share; apps/mockup/queue-app/rotra-queue.html › `.qs-card`; apps/mockup/admin-app/rotra-admin.html › `.qs-card`
Route: every Share button except the session and club invites
Screen ID: share dialog
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ, https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh, https://claude.ai/artifact/1Au5cHUNCeZJ3JQNPWXsXz
Components: share-card
Supersedes: the corner QR in the Player share cards (D-2026-11-09-08 layout) and the grid background on the Queue/Admin share cards
Superseded by: none

## What changed
- Before: Queue and Admin share images (Share your finish, Share profile, Share leaderboard) had a fine green grid behind them; Player share images (profile, rank, result, games) had a small QR in the bottom-right corner, drawn into the downloaded image too, and the dialog said “The QR opens the profile; private profiles ask visitors to log in.”
- After: plain dark card with the soft green glow, no grid; no QR on the image (preview or download); the hint is gone. The link field under OR is how people open the profile.
- Unchanged: the Session QR card (Invite Session) and the club invite keep their QR and look.

## Why
- Owner, November 13, 2026: “please get rid of the grid background designs for all share photos and also get rid of the QRs EXCEPT Invite Session, Invite Club”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: each share kind in Story, Facebook post and Square; downloaded Player PNG has no QR.
- Copy: hint removed.
- Tokens: none
- Known differences: none

## Reuse plan
- Changes share-card only.
