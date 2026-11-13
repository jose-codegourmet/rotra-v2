# Profile card: open in a new tab, Share profile

Status: IN MOCK APP — #814
Date: 2026-11-13
App: queue, player, admin
Mockup: apps/mockup/queue-app/rotra-queue.html › SHEETS.pubProfile, SHEETS.profile (ppName, rotraProfileUrl), SHEETS.shareFinish (kind: 'profile'); apps/mockup/player-app/rotra-player.html › SHEETS.profileCard, shareModel (sh.pid), openShare; apps/mockup/admin-app/rotra-admin.html › playerManagementSheet quick view (qvFoot), shareProfileSheet, rotraProfileUrl
Route: /queue/s/<session> (profile card); /player leaderboard, club members (profile card)
Screen ID: D-PARTICIPANT-PROFILE, P-PROFILE, Admin player quick view
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh, https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ, https://claude.ai/artifact/1Au5cHUNCeZJ3JQNPWXsXz
Components: participant-profile-card, share-dialog
Supersedes: none
Superseded by: none

## What changed
- Before: the profile card's footer had Close and Open ROTRA profile (Queue) or Open full profile (Player, same tab); no way to share another player's profile from the card.
- After: a small new-tab icon (28 px hit area) sits right of the display name and opens the player's ROTRA profile in a new tab. Footer: **Close**, **Share profile** (share icon) and **Open ROTRA profile** with the new-tab icon, opening in a new tab (Player's "Open full profile" renamed to match). Share profile opens the standard share dialog (Story, Facebook post, Square, then OR and the Profile link field): Queue's image shows picture, display name, RTR ID, "Win rate · YEAR" big with games, W and L; Player's reuses its own Share profile card for that player. The Queue Master's own player card gets only the name icon. Admin quick view (owner, same day: "Yes, Admin too"): the name icon, and **Share profile** between Full history and Full profile, opening the same share dialog with **Back** to the quick view; Full profile stays the Admin player page.
- Unchanged: private and guest cards (no name icon, no share), the rest of the card.

## Why
- Owner, November 13, 2026: "put a clickable icon on the right side of the name. it should open to a new tab · same goes for rotra profile · there should be a share profile button in the profile card".

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: registered player with and without nickname, player with no games this year, private and guest cards (unchanged); share dialog in all three sizes.
- Copy: "Share profile", "Open ROTRA profile", "Open NAME's ROTRA profile in a new tab", "Profile link", "Win rate · YEAR".
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: share-dialog (size tiles, OR divider, copy field).
- Extends: participant-profile-card (name icon, footer); Player share card model takes any player.

## Pass 2 (owner, November 13, 2026: “Open ROTRA Profile only opens to a new tab if the source or host is Queue App; in the Player App it should not go to new tab”)
- In ROTRA Player's profile card, **Open ROTRA profile** and the icon right of the name open the profile in the same tab (in-app navigation; the card closes). The name icon there is a forward arrow instead of the new-tab icon, and the button has no new-tab icon. Queue (and Admin) keep opening the ROTRA profile in a new tab, since it is another app.

## Pass 3 (artifact comment, November 13, 2026, on another player's profile page: “there should be share profile button”)
- A public profile that isn't yours now has **Share profile** next to **Compare with me** in the identity card, opening the Share profile dialog for that player (link `/player/players/<id>`). Recorded as [D-2026-11-13-06](../mvp/decisions.md#d-2026-11-13-06).
