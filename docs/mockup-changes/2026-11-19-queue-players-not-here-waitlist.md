# Queue app: the live Players tab filter adds Not here and Waitlist

Status: TICKETED — #1051
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › console › Players (`playersPane()`)
Route: /queue/sessions/s-tonight?tab=roster
Screen ID: Q-POOL
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: segmented control, player cards, waitlist panel
Supersedes: none
Superseded by: none

## What changed
- The Show filter on the live Players tab was **Available · N**, **Present · N**, **Everyone · N**. It is now
  **Available · N**, **Present · N**, **Not here · N**, **Waitlist · N**, **Everyone · N**.
- **Not here** lists roster players marked away, as the same player cards (Present switch, No show (cancelled) when
  they have no games). Empty: “Everyone on the roster is here.”
- **Waitlist** shows the waitlist card (Admit player, remove) in place of the player cards; the sort menu hides. The
  waitlist card is then not repeated under the cards.

## Why
- Owner artifact comment, November 19, 2026, on the Players tab's Show filter: “Add "Not Here" and Waitlist”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: each filter selected; Not here with nobody away; Waitlist empty and with players.

## Copy
- “Not here · N”, “Waitlist · N”, “Everyone on the roster is here.”

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Players filter line)
