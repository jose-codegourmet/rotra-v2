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
