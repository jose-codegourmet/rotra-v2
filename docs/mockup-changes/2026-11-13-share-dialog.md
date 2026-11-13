# Share dialog: Story, Facebook post and Square, a big OR, and a copy field with the icon inside

Status: IN MOCK APP — #808
Date: 2026-11-13
App: player
Mockup: apps/mockup/player-app/rotra-player.html › SHEETS.share (Share profile, Share rank, Share result, Share games); apps/mockup/queue-app/rotra-queue.html › SHEETS.shareFinish (Leaderboard › Your position › Share)
Route: /player/players/<own id> (Share profile); /queue/s/<finished session> › Leaderboard (results shared)
Screen ID: P-OWN-PROFILE share sheet, Q-PUBLIC Leaderboard
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: share-sheet, share-card, copy-field (new)
Supersedes: none
Superseded by: none

One change across the two apps that have Share buttons for images; logged under `player`.

## What changed
- Player share dialog: a **Post / Story** toggle over one preview → **three size tiles** side by side: **Story** (9:16), **Facebook post** (4:5, selected first) and **Square** (1:1, new). Each tile is the live card scaled down (Story 113 × 200, Post 160 × 200, Square 160 × 160) with its name and “9:16 · Facebook and Instagram stories” / “4:5 · Facebook feed” / “1:1 · Instagram feed”; the selected one has a 2 px accent border. Under the tiles: “Pick a size, then download it or share it. The QR opens your profile; private profiles ask visitors to log in.”, **Download <size>** (Square is drawn at 1080 × 1080 with 2 game rows) and **Share** where the system share exists. Then a big **OR** divider (18 px, 2 px letter-spacing, hairlines either side), then the link field. The footer is **Close** only; the dialog is the wide sheet.
- **Copy field**: `[ input ] [Copy]` → one 44 px field with the link in monospace and a 34 px copy icon button **inside** it on the right (accessible name “Copy profile link” / “Copy link”).
- Queue, Leaderboard › Your position › **Share**: shared straight to the system sheet → opens **Share your finish**, the same layout: the three sizes of a finish card (viewer's picture and name, the club, the session title, “#N of M”, W, L and games, the date, the ROTRA mark, on the podium's green grid), **Download <size>** (prototype: a toast), **Share**, the **OR** divider and the **Session link** copy field.

## Why
- Owner, November 13, 2026: “Share buttons should always show a dialog showing · story version · fb post version · square version (instagram) · and put a big OR divider · and then copy link · the copy link input also needs to be updated · it shouldn't be [ input ] [button] · instead just [ input [] ] ← copy icon”.

## Like for like
- Compare at: 375 px (the tiles scroll sideways) and 1280 px, dark and light.
- States: each size selected; Download per size; Share present / absent; copy success and clipboard failure (“Couldn't copy. Your profile link is …”); profile, rank, result and games kinds; Queue finish card.
- Copy: “Story”, “Facebook post”, “Square”, the three hints, “Download story” / “Download facebook post” / “Download square”, “Story image downloaded” / “Facebook post image downloaded” / “Square image downloaded”, “OR”, “Profile link”, “Link”, “Session link”, “Share your finish”, “Link copied”.
- Tokens: none new; the share cards keep their fixed image colours (they are exported images).
- Known differences: none

## Reuse plan
- Reuses as is: share-card (Player), sheet (wide).
- Extends: share-sheet — three-size picker instead of the toggle; share-card — a `square` size.
- New: copy-field — read-only input with an inline copy icon, to replace input + Copy button pairs; the Queue finish card.
- Shares work with: 2026-11-13-queue-finished-session-page.md

## Docs updated
- Business logic: none needed.
- Database design: none needed.
- Screen docs: player-information/ranking-history.md (share dialog layout); queue/public-session.md (Share your finish).

## Real app work
- Share dialog with three sizes and the OR + copy field in apps/player; Square export (1080 × 1080); the copy-field component; the Queue finish share dialog.
