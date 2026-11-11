# Generate matches: bagging mode with a bagging pairs list (#739, proposed)

Status: NEW
Date: 2026-11-11
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Live console › Queue tab › Generate matches workspace › header switch, Bagging pairs card, Add bagging pair sheet
Route: /queue/sessions/s-tonight (Queue tab › Generate matches)
Screen ID: Q-AUTO (new sheet: bagging pair add)
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: generate-matches-workspace, switch, segmented-control, bagging-pairs-card (new), bagging-pair-sheet (new), player-select
Supersedes: none
Superseded by: none

## What changed
- Before: Generate matches picked partners only by level balance and fairness; the Queue Master could not keep two players together.
- After (doubles sessions only): the workspace header has a **Bagging mode** switch, off by default, one switch for the whole session. The switch is hidden when the session has no doubles. When on, a **Bagging pairs** card appears under the header with the helper line, an **Add pair** button and one row per pair: two avatars, “A and B”, a three-way choice **All games · Games 1 and 3 · Games 2 and 4**, and **Remove**. Empty: “No pairs yet. Add a pair to keep two players as partners.”
- **Add pair** opens the sheet **Add bagging pair**: two player pickers (First player, Second player; present roster players only), the pattern choice, **Cancel** / **Add pair**. A player can be in one pair; picking someone already paired shows a warning notice and the primary becomes **Replace pair**.
- Generate (every tab, Catch Up included) keeps a listed pair together as partners on the games their pattern covers: if one is among the picked players and the other is free, the partner is swapped in; if both are picked they are put on the same team; if the partner is not free the player is generated like anyone else and the pair stays listed. The pair wins over fairness and level balance; court capacity still wins over the pair. The draft tile's status line reads “Bagging pair: A and B are partners”. A pair's game number is counted on games actually played together (the lower of the two players' games + 1), not on drafts. Auto Queue and matches built by hand ignore the list.

## Why
- Owner decision pack, ticket #739 (recommended options): doubles only; the pair is partners on every game Generate makes for either of them while listed; patterns counted on the pair's own played games; simply not required to be together on the other games; no limit on pairs, one pair per player (replace to move); Queue Master only, from the Generate matches workspace; one session-wide switch; partner not free means the other player is generated normally; nothing special when fewer games are played; pairs guide every Generate tab and not Auto Queue or hand-made matches; the pair wins over fairness, court capacity wins over the pair.
- Ticket text: “In Generate matches, add a toggleable mode called bagging mode … There should be a bagging pairs list. That list is a guide for Generate matches on how to generate the queue.”
- Proposed, built to the recommended option of the owner decision pack. The owner has not approved it yet.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: default off, on with no pairs (empty line), on with pairs, pair with each pattern selected, Add pair sheet (no player chosen: Add pair disabled; two players chosen; a chosen player already paired: warning + Replace pair; fewer than two present: “Mark at least two players present first.”), switch hidden for singles-only sessions, draft tile showing the bagging reason, switch off keeps the list but Generate ignores it.
- Copy: Bagging mode · Bagging pairs · Bagging pairs · N · Pairs guide Generate matches. Auto Queue and matches you build by hand are not affected. · Add pair · No pairs yet. Add a pair to keep two players as partners. · All games · Games 1 and 3 · Games 2 and 4 · Remove · Add bagging pair · First player · Second player · Choose a player… · Partners in · NAME is already paired with NAME. Adding this pair replaces it. · Replace pair · Mark at least two players present first. · Bagging pair: A and B are partners · toasts “Bagging mode on”, “Bagging mode off”, “Bagging pair added · A and B”, “Pair removed · A and B”.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: switch, segmented control, notice, sheet shell, avatar, list row.
- Extends: the Generate matches workspace (header switch, pairs card slot) and draft tile status text (reason).
- New: bagging-pairs-card and bagging-pair-sheet, no existing component lists pairs of players.
- Shares work with: none

## Docs updated
- Business logic: none yet — proposal pending owner approval; business/screen docs follow when approved
- Database design: none yet — proposal pending owner approval; business/screen docs follow when approved
- Screen docs: none yet — proposal pending owner approval; business/screen docs follow when approved

## Real app work
- Session setting `bagging` (switch + pairs) on the live session, Queue Master only; Generate matches partner placement in all tabs; Queue UI above. No auto-generate path yet (see open #725). Database design and business docs follow approval.

## Owner request, November 11, 2026 ("please do this next", #739)
- Verified in the browser: the switch, the pairs card, Add bagging pair, and Generate matches with a pair.
- Changed: an applicable pair whose two players are both free now **leads the next doubles draft** (the owner's answer to Q12: the pair beats fairness; court capacity still wins). Before, the pair only joined a draft when the usual ordering happened to pick one of them, so a fresh pair could stay out of the drafts. The draft tile keeps the reason line **Bagging pair: NAME and NAME are partners**.

## Owner comment, November 11, 2026 (on the Add bagging pair sheet): "this should be a grid of players in avatar with skill circle, and just click and click to match the pair"
- Changed: the two dropdowns are gone. The sheet shows every present player as a round avatar with their level ring (the same colours as the session page's Participants grid), first name and level under it. Tap one player, then another: the two get **1** and **2** badges and a green ring, the status line reads **Kat and Bea · tap a player to change the pair**, and **Add pair** saves. Tapping a picked player clears them; tapping a third player swaps the partner. The pattern segment (**All games · Games 1 and 3 · Games 2 and 4**) and the replace-pair notice stay.
- Copy added: **Tap two players to make a pair. The ring is tonight's level.**, **NAME · tap their partner**, **NAME and NAME · tap a player to change the pair**; accessible names end with **picked first** / **picked second**.

## Owner comment, November 11, 2026 (on the pattern buttons): "this depends on the minimum games: if minimum is 5, show 1 2 3 4 5 and a button called ALL"
- Changed: the three preset patterns are replaced by **ALL** followed by one button per game number from **1** to the session **minimum** (a minimum of 4 shows **ALL 1 2 3 4**). Tap the numbers the pair should play together; tapping every number, or none, falls back to ALL. The same row appears in the Add bagging pair sheet (label **Partners in · tap the game numbers, or ALL**) and on each pair in the Bagging pairs list. A pair applies to its next game together when that game's number is picked, or always under ALL; games past the minimum only count under ALL.
- Copy: **ALL**, **1** … **N**; accessible names **Game N**.

## Owner comment, November 11, 2026 (on the Add bagging pair sheet): wide dialog, selections on top, GAMES row, paginated grid, Add pair disabled until a pair
- Changed: the sheet is a **wide** dialog. At the top, two slots **Selection 1** and **Selection 2** (dashed placeholders with “Tap a player below” / “Then their partner”; once filled, the player's avatar with their level ring, name and level, and an × — tap the slot to clear it). Under them the **Games · the ones they play together, or ALL** row (**ALL 1 … N**). A rule, then **Present players · N** with **Previous / Next** and “Page 1 of N” when there are more than 24, and the avatar grid (24 per page, up to 12 across on wide screens). A rule, then the replace notice if a pick is already paired. **Add pair** stays disabled until both slots are filled.
- Copy added: **Selection 1**, **Selection 2**, **Tap a player below**, **Then their partner**, **Games · the ones they play together, or ALL**, **Present players · N**, **Previous**, **Next**, **Page N of M**.
- Owner comment, November 11, 2026 (same thread): no level text under the avatars in the pair dialog; the ring colour is enough. Tiles show the first name only; the selection slots show the full name only. The accessible names still carry the level.
