# Admitted players can step down to the waitlist; Queue Master can overfill the roster (#735, proposed)

Status: IN MOCK APP — #735
Date: 2026-11-11
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Preparation › Roster and levels tab (rows and grid cards), Live console › Players tab cards, public session page › My night, Overfill confirmation sheet
Route: /queue/sessions/s-tonight/preparation?tab=roster; /queue/sessions/s-tonight (Players tab); /queue/s/s-tonight (signed-in player)
Screen ID: Q-ROSTER, Q-ADD-PLAYER, Q-PUBLIC-JOIN (new sheet: overfill confirmation)
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: roster-card, roster-row, player-pool-card, slot-meter (roster summary), confirm-sheet, my-night-card
Supersedes: none
Superseded by: none

## What changed
- Before: before Start, adding a player to a full roster silently sent them to the waitlist; nobody already on the roster could move to the waitlist; the slot count could not exceed capacity by choice; expected games already followed the roster.
- After: every roster row and grid card on **Roster and levels** (preparation, and after Start) and every card on the live **Players** tab has a **Move to waitlist** button (secondary, next to Remove). It puts the player at the front of the waitlist; their level and paid mark stay and come back if they regain a slot. It is blocked with the toast “Finish or remove NAME's match first.” when the player is in any waiting, on-court or playing match.
- On the public session page, a signed-in joined player's **My night** card gets **Move me to the waitlist** (same block while in a match; the player-side string is “You're in a match. Ask the Queue Master to finish or remove it first.”; success toast “You moved to the waitlist”). The player then sees “Waitlist #N · you get a slot if one opens”.
- When the roster is full and the Queue Master adds someone (Add player, Add late player, or Give slot anyway), the confirmation sheet **Add NAME anyway?** opens once: “The roster is full (24/24). Add NAME anyway?” with “Expected games drop from 4 to 3.” (or “Expected games stay at N.” when they do not change), buttons **Cancel**, **Add to waitlist** (Add player flows only) and **Add anyway**. After it the roster summary shows 25/24 with the count in the warning colour and “1 over capacity”. The roster summary line now also reads “expected games about low–high each”, recomputed on every roster change (overfill, step down, waitlist promotion, late add, removal).

## Why
- Owner decision pack, ticket #735 (recommended options): before Start and after Start while not in a match, for the player and the Queue Master alike; a player in a match is blocked; expected games update whenever the roster count changes; the Queue Master gets a one-time confirmation before overfilling, then 25/24 in the warning colour; paid mark and level stay on a stepped-down player (same rule as a demotion, D-2026-11-11-06).
- Ticket text: “They can move themselves to the waitlist. The Queue Master can also assign them to the waitlist … Only the Queue Master can move them onto the roster anyway. When that happens, the slot count should show over capacity, for example 25/24, and the amount of expected games should be updated.”
- Proposed, built to the recommended option of the owner decision pack. The owner has not approved it yet.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Roster row and grid card with Move to waitlist; Players card with Move to waitlist; blocked (toast) when in a match; roster summary at 23/24, 24/24 (“Full · new players go on the waitlist”), 25/24 (warning colour, “1 over capacity · new players go on the waitlist”); overfill sheet with the drop line and the stay line; Cancel returns to the Add player sheet; public My night with the new button before and after Start, hidden once the session is finalized; waitlist panel shows the stepped-down player at the front. Known mock limit: after Start the mock leaderboard is built from the roster, so a stepped-down player's finished games leave tonight's standings (the real app keeps them on the record).
- Copy: Move to waitlist · Move me to the waitlist · Finish or remove NAME's match first. · You're in a match. Ask the Queue Master to finish or remove it first. · You moved to the waitlist · NAME moved to the waitlist · Add NAME anyway? · The roster is full (N/CAP). Add NAME anyway? · Expected games drop from A to B. · Expected games stay at A. · Cancel · Add to waitlist · Add anyway · N over capacity · expected games about LOW–HIGH each.
- Tokens: none (reuses --warn)
- Known differences: none

## Reuse plan
- Reuses as is: roster row/card, player pool card, confirm sheet, roster summary bar, My night card, toast.
- Extends: roster-card and player-pool-card (secondary action), roster summary (over state and expected games), my-night-card (action).
- New: none
- Shares work with: 2026-11-11-queue-set-games-played.md (Players tab cards), 2026-11-11-queue-start-session-online-only.md (Players tab and roster)

## Docs updated
- Business logic: `docs/business_logic/product/queue/modules/players/README.md` › Slots and waitlist (stepping down, overfilling, expected games), Roster changes; `docs/business_logic/product/open-decisions.md` (Queue rows: standings for a stepped-down player still open).
- Database design: `docs/database_design/product/queue/modules/sessions-roster.md` › `session_waitlist` (step-down inserts at the front, refused while in an unfinished match; no new field).
- Screen docs: `docs/screens/product/dialogs.md` › D-OVERFILL (new); `docs/screens/product/modules/queue/session-setup.md` › Roster and levels, Waitlist; `docs/screens/product/modules/queue/players-roster.md` › Q-ADD-PLAYER, Q-ROSTER; `docs/screens/product/modules/queue/session-console.md` › Q-POOL; `docs/screens/product/modules/queue/public-session.md` › My night (Move me to the waitlist, hidden while in a match); `docs/screens/product/open-decisions.md`.

## Real app work
- Step-down action for the Queue Master and for the signed-in player, server-side block while in an unfinished match, front-of-waitlist placement, over-capacity add with confirmation, expected games recomputed on every roster count change (queue app, player app session page, packages/ui roster-card and summary). Needs a decision on keeping finished games for a stepped-down player in the standings.

## Owner comment, November 11, 2026 (on My night): "you can't be moved to waitlist, you already are playing!"
- Changed: the **Move me to the waitlist** button is not shown while the player is in a match (on court, playing, or in a queued match). It shows again once their match is done. The Queue Master's **Move to waitlist** on the Players tab keeps its blocking toast.
