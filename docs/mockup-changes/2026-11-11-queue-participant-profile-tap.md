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

## Owner comment, November 11, 2026 (artifact thread on the Queue prototype)
- "please update like showing profile in discord — the layout here looks so boring".
- Changed: the participant profile sheet is now a profile card. A banner strip across the top (accent gradient from the existing tokens), the big photo overlapping the banner's bottom edge with a surface-coloured ring (still opens the full photo, #716), the name in bold with the nickname in quotes beside it, the **Registered** chip and a **level badge** on one row, then a **Tonight ·** status line with a coloured dot (Playing · Court N / On court · getting ready · Court N / Queued · #N / Free / Away, from the live session; hidden when the player is not on tonight's roster), then two boxed sections: **About** (Registered in, RTR ID) and **Stats · last 90 days** as four tiles (Games, Wins, Losses, Win rate) or “No games yet”. The sheet body has no padding so the banner runs edge to edge. Nickname and Level left the key-value list.
- Copy added: **Tonight ·**, **About**, **Games**, **Wins**, **Losses**, **Win rate**. Removed: the **Nickname** and **Level** rows.
- States added: status dot colours for playing (accent), getting ready, free and away; no status line when the player is not in this session.

## Owner comment, November 11, 2026 (second, on the live session console)
- "clicking on the avatars here opens a profile dialog".
- Changed: the Queue Master's own **player profile** sheet (opened from court faces, queue faces, the Players tab and Saved players) uses the same banner profile card: banner, overlapping photo (opens the full photo), name and nickname, the identity chip and a level badge (**Intermediate High tonight** when the player is on the roster, **Intermediate High · suggestion** otherwise, **No level yet**), the identity line, the **Tonight ·** status line, then boxed sections **About** (Registered in, RTR ID, Joined) and **In your club** (Added to club, Sessions here, Phone). The guest invite section and the levels note stay below. Footer unchanged (Back / Close, Delete player, Link to saved player…, Invite).
- The avatar on each Players-tab card is now a button that opens that profile (the card itself still selects the player for a match).
- Copy added: **In your club**, **tonight** and **· suggestion** suffixes on the level badge, **No level yet**. Removed rows: **Nickname**, **Level suggestion** (now the badge).
