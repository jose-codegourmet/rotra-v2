# Player Information finds unclaimed players by name and shows their name and picture

Status: IN MOCK APP — PR #1030
Date: 2026-11-23
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › sheet `add` (Player Information tab, pick card), `pickPlayer`, `confirmAdd`; `DIRECTORY`
Route: /queue/players (Saved players › Add player); /queue/sessions/s-tonight/preparation?tab=roster (Add player)
Screen ID: Q-ADD-PLAYER
Components: add-player-sheet, player-confirm-card
Supersedes: 2026-11-16-queue-unclaimed-email-lookup.md (in part: exact lookup only; "Not registered yet" with no name or picture)
Superseded by: none

## What changed
- **Search Player Information** placeholder “RTR ID, email, social link or name”; hint “Enter the full RTR ID, email or
  social link, or an unclaimed player's name. Registered players are found by RTR ID or email only.” Typing two letters
  or more of an unclaimed player's name lists them (players already in this club's saved players are left out). Empty:
  “No ROTRA player matches.” / “Enter an RTR ID, email, social link or name to find a ROTRA player.”
- Results and the pick card show the unclaimed player's **name and picture** (the first club's version) instead of a blank
  face and “Not registered yet”.
- The pick card's **Full or display name** (this club's own name) is **prefilled** with that name.
- Prototype: “jun” finds Jun Bautista; “ivan” finds Ivan Dela Rosa.

## Why
- Owner, November 23, 2026: “unclaimed players should be searchable!”; asked name-and-photo vs name search vs both:
  “Both”. Decision [D-2026-11-23-01](../mvp/decisions/2026-11-23.md#d-2026-11-23-01).

## Docs updated
- product-terms.md (Player lookup); business logic queue/modules/players/README.md and player-information identity;
  screen doc queue/players-roster.md (Player Information tab)

## Real app work
- Done in the same PR: lookup by name for unclaimed players (mock store and `GET /api/players?q=`), name and picture on
  results, the prefilled own-name field.
