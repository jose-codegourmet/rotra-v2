# Player: Share profile card with QR, photo, level, stats and a copyable link (#738, proposed)

Status: NEW
Date: 2026-11-11
App: player
Mockup: apps/mockup/player-app/rotra-player.html › My profile › Share profile (new share sheet kind, same sheet as Share rank, Share result, Share games)
Route: /player/players/u1 (sign in as Migs from Prototype, then My profile › Share profile)
Screen ID: P-OWN-PROFILE
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: share-card (the share sheet and card used by Share rank, Share result and Share games), avatar
Supersedes: none
Superseded by: none

## What changed
- Before: the profile had Share rank (only with a rank), Share result and Share games. No profile card and no visible link field.
- After: own profile only gets a **Share profile** button beside **Edit profile** and **My player ID**. It opens the existing share sheet with a **Post / Story** toggle and a profile card: picture (photo, chosen character or initials), name and nickname, level or **Not ranked yet**, overall leaderboard position only when there is one, then **Last 90 days** with **Games**, **W–L** and **Win rate**, or **No games yet**. The card keeps the small QR in its corner (opens the public profile). Below the card is a read-only **Profile link** field with a **Copy** button beside it. Footer has **Download image** and **Share** (system Share sheet). The card is always available, even without a photo, level or games. Download image draws the same card on a canvas.
- Proposed, built to the recommended option of the owner decision pack; the owner has not approved it yet.

## Why
- Ticket #738: “Add a Share profile action that produces a shareable profile card with a QR code. The card should show the player's picture, level, and stats … There should also be an input that shows the profile link, with a way to copy that link.”
- Recommended answers built: Q1 A new action next to the existing three; Q2 A level, leaderboard position (if any), games played, wins and losses, win rate over the last 90 days; Q3 A downloadable images plus system Share, no Facebook or Instagram login; Q4 A same two sizes as the existing cards; Q5 A QR opens the public profile; Q6 A visible link field with Copy; Q7 A own profile only; Q8 A character or initials, “Not ranked yet”, “No games yet”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Post and Story toggle (Post is the existing 4:5 card, 1080 x 1350; Story is the existing 9:16 card, 1080 x 1920); ranked with position; ranked without a position; no rank yet (level shows **Not ranked yet**, no position); games in the last 90 days; no games yet; photo, character and initials avatars; link field focused (selects the link); Copy success toast; Copy failure toast; Download image toast; no button for other people's profiles or signed-out visitors.
- Copy: **Share profile** (button and sheet title); **Post**; **Story**; **Not ranked yet**; **OVERALL**; **LAST 90 DAYS** (shown as Last 90 days); **Games**; **W–L**; **Win rate**; **No games yet**; **Profile link**; **Copy**; **Download image**; **Share**; existing caption “The QR opens your profile. Private profiles ask visitors to log in.” plus the size sentence; toasts **Link copied**, **Post image downloaded**, **Story image downloaded**.
- Tokens: none new (the card keeps the fixed dark brand card colours the other share cards already use)
- Known differences: the owner pack says "square post (1080x1080)"; the existing cards, and so this one, are 1080 x 1350 for Post. Built like the existing cards; owner to confirm.

## Reuse plan
- Reuses as is: the share sheet, Post/Story toggle, card frame, QR, Download image and Share buttons from Share rank, Share result and Share games.
- Extends: the share card with a "profile" kind, a stats block (three figures and a note) and a level block that can hide the position; the sheet with a read-only link field and Copy.
- New: none
- Shares work with: any log that changes the share card (none open today).

## Docs updated
- Business logic: none yet — proposal pending owner approval; business/screen docs follow when approved
- Database design: none yet — proposal pending owner approval; business/screen docs follow when approved
- Screen docs: none yet — proposal pending owner approval; business/screen docs follow when approved

## Real app work
- Add a Share profile button to the own-profile hero in apps/player; add a "profile" kind to the share model and card in @rotra/ui (level, optional position, 90-day games, W–L, win rate; empty states), a read-only link field with Copy in the share sheet, canvas drawing for the new blocks. Stats use the same 90-day window as rank. Own profile only.
