# Queue app: no Move to waitlist on the live Players card

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › console › Players (`playersPane()`), Session settings › Roster and levels grid (`rvCard()`)
Route: /queue/sessions/s-tonight?tab=roster
Screen ID: Q-POOL, Q-PREPARE (live, read-only)
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: player card, roster card
Supersedes: part of 2026-11-11-queue-roster-waitlist-overfill (Move to waitlist after Start, Queue Master side)
Superseded by: none

## What changed
- The live Players card no longer has **Move to waitlist**. **No show (cancelled)** stays where it was.
- The read-only roster grid on Session settings during play no longer shows it either. Before Start nothing changes:
  Roster and levels keeps **Move to waitlist** on every row and card.

## Why
- Owner artifact comment, November 19, 2026, on the live card's Move to waitlist button: “since the session is
  already running. this should not be here”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: live Players card (present, away with no games, playing); preparation roster row and card (unchanged).

## Open
- The signed-in player's own **Move me to the waitlist** on the session page's My night still shows during play. Does
  it go too?

## Docs updated
- docs/business_logic/product/queue/modules/players/README.md (Stepping down; live session line)
- docs/screens/product/modules/queue/session-console.md (Player card)
- docs/screens/product/modules/queue/players-roster.md (Live console card; Stepping down)
