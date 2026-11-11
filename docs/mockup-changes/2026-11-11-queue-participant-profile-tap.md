# Tap a participant on the session page to open their profile (#731, proposed)

Status: NEW
Date: 2026-11-11
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › Participants tab › participant tile, Participant profile sheet, Private profile card
Route: /queue/sessions/s-tonight/public-page?tab=participants (View as a signed-in player)
Screen ID: Q-PUBLIC-PARTICIPANTS
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: participant-tile, player-profile-sheet (new public variant), private-profile-card (new), avatar
Supersedes: none
Superseded by: none

## What changed
- Before: for a signed-in player a tile was a link that opened the player's page in a new tab; nothing opened inside the session page.
- After: for any signed-in registered player (in this session or not), a registered participant's tile is a button that opens the **participant profile** sheet: big photo (tap it to open the full-photo viewer, see the avatar viewer log), name, Registered chip, Registered ROTRA player, Nickname, Level, Registered in, RTR ID, **Stats · last 90 days** (Games played, Win rate, Wins, Losses; “No games yet” without games) and **Close** / **Open ROTRA profile**. A hint line above the grid reads “Tap a player to see their profile and stats.” Visitors and guests still see plain tiles.
- An always-private player (mock flag on two fixture players, see #715) is masked for everyone: initials instead of the photo and a masked name on the tile; the tap opens a small card with the masked name, initials, “This player keeps their profile private.” and no stats. A player with Private visibility (today's switch) opens the full profile for signed-in players, as decided on November 9.

## Why
- Owner decision pack, ticket #731 (recommended options): any signed-in registered player, whether or not they are in the session; private shows the profile, always private opens the small masked card; the tile opens the profile and the photo viewer opens from the big photo inside it.
- Ticket text: “When a registered player is in, they should be able to click a player and open that player's profile, including stats and profile info.”
- Proposed, built to the recommended option of the owner decision pack. The owner has not approved it yet.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: tile hover and focus ring, profile sheet with photo, profile sheet for a player without a photo (initials), stats with games, stats empty (“No games yet”), always-private tile (initials, masked name) and its card, own tile (“You”), visitor and guest views unchanged.
- Copy: Tap a player to see their profile and stats. · NAME · view profile (accessible name) · Registered ROTRA player · Nickname · Level · Registered in · RTR ID · Stats · last 90 days · Games played · Win rate · Wins · Losses · No games yet · Open ROTRA profile · Close · This player keeps their profile private.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: participant tile, sheet shell, chip, key-value list, avatar.
- Extends: participant-tile (button variant for signed-in viewers).
- New: player-profile-sheet public variant and private-profile-card (the existing Queue profile sheet shows club-private fields such as phone, so it cannot be reused on the public page).
- Shares work with: 2026-11-11-queue-avatar-photo-viewer.md

## Docs updated
- Business logic: none yet — proposal pending owner approval; business/screen docs follow when approved
- Database design: none yet — proposal pending owner approval; business/screen docs follow when approved
- Screen docs: none yet — proposal pending owner approval; business/screen docs follow when approved

## Real app work
- Signed-in viewer check, public profile reads (stats over the same 90-day window as rank), always-private handling (depends on #715's third visibility level), tile button and sheets in the player app session page and packages/ui.
