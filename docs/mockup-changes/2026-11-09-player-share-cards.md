# Players share a rank card, a session result and a session's games as link, QR or post/story image

Status: TICKETED — #588
Date: 2026-11-09
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Own profile (Shared rank, My sessions) and Games (session groups) › Share sheet
Route: /player/players/u1
Screen ID: P-OWN-PROFILE, P-MATCH-HISTORY (Share sheet)
Artifact: none
Components: session-join-qr, segmented-control, skill-ladder, sheet, avatar
Supersedes: none
Superseded by: none

## What changed
- Before: a player could copy their player ID but had nothing to post or send about their rank or results.
- After: one **Share** sheet with three cards on the fixed dark ROTRA brand card (green accent in both themes), a **Post | Story** switch (4:5 and 9:16), and a small corner QR that opens the player's profile.
  - **Rank card:** **Share** button in the “Shared rank” card header (own profile, only when there is a rank). Picture, name and nickname, level, “Overall #N” or “No position”, the ladder; no club.
  - **My session result:** **Share result** in My sessions (new Finished list) and in each Match history session group. Session title, date and club, “#N in Standings”, “G games · W–L”.
  - **Session games:** **Share games** on each Match history session group. Date and club, one line per game, “Total W–L”; at most 8 lines, then “+N more games”.
  - Result and games sharing exist only for published sessions (`published: true` in the fixtures; one session is unpublished). An unpublished session shows no button and “Results not shared yet by the club.”
  - Buttons: **Copy link**, then **Share** (toast “Share sheet opened”) where the browser has Web Share, otherwise **Download image** (a real PNG at 1080 × 1350 or 1080 × 1920).
  - Other players' names on the images are masked for private players and guests (first letter plus `***` per word) and shown in full for public players, whoever is signed in.

## Why
- Decision [D-2026-11-09-08](../mvp/decisions.md#d-2026-11-09-08): "share by link", "share by QR", and "sharing pictures such as fb posts and ig stories posts… follow the ratio". Masking follows [D-2026-11-09-07](../mvp/decisions.md#d-2026-11-09-07).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: rank card with a position, with “No position”; share button hidden with no rank; result card; games card with scores, with “Winner recorded”, with masked names, with more than 8 games; published and unpublished session groups; My sessions Finished list with both; Post and Story; Web Share available vs Download image; clipboard failure toast.
- Copy: “Share”, “Share result”, “Share games”, “Results not shared yet by the club.”, “Finished”, “#N in Standings”, “G games · W–L”, “Total W–L W–L”, “+N more games”, “Winner recorded”, “Copy link”, “Download image”, “Link copied”, “Share sheet opened”, “The QR opens your profile. Private profiles ask visitors to log in.”
- Tokens: none new for the app. The card uses the same fixed brand values as the Queue Session QR card (`--qc-bg #0b0b0c`, `--qc-fg #f0f0f2`, `--qc-dim #9090a0`, `--qc-accent #00ff88`) so it does not follow the theme, plus a card-local cell color `rgba(255,255,255,0.1)` for ladder cells.
- Known differences: the prototype's masked and guest names come from a small fixed list; the real app reads each player's privacy setting. Web Share with the image attached is not verified on real phones.

## Reuse plan
- Reuses as is: `segmented-control/` (Post | Story), `skill-ladder/` (its band layout, redrawn on the card), `avatar/`, `sheet/`
- Extends: `session-join-qr/` — its card shell and canvas download helper get an info-card variant (avatar header, content blocks, corner QR instead of the centered QR with logo)
- New: none expected; a `share-card` content layout only if the extended helper gets too big
- Shares work with: `2026-11-08-queue-session-qr-share-card` (same card and download code), the Session invite and Club invite link share cards under the same decision

## Docs updated
- Business logic: docs/business_logic/product/player-information/modules/ranking/README.md — What a player may share, published-only rule
- Database design: none needed (images are drawn on the device; the published flag already comes with the session's publish state)
- Screen docs: docs/screens/product/modules/player-information/profile.md — Share rank; ranking-history.md — Share cards (Share result, Share games, published-only rule)

## Real app work
- Share sheet and three card layouts in `@rotra/ui`, wired from the profile, My sessions and Match history; canvas download and Web Share helper shared with the Queue Session QR card; the published flag from the session's publish state
