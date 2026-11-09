# Find a player in the Main Queue

Status: NEW
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › live session › Queue tab › Main Queue
Route: /queue/sessions/[sessionId]
Screen ID: Q-QUEUE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: queue match card (qtile), search input
Supersedes: none
Superseded by: none

## What changed
- Before: no way to find a player's cards in a long Main Queue except by scanning.
- After: a search field “Find a player in the queue” (name or nickname, case-insensitive) above the queue cards. While it has text, cards holding a matching player glow in the warning color (border + outer glow), that player's picture gets a warning ring and bold name, and every other card fades to 45 %. A result line reads “N queued match(es) with TEXT” or, muted, “Not in any queued match”. The first highlighted card scrolls into view when the text changes. Clearing the field restores all cards.
- View-only: search never changes order or lineups.

## Why
- Owner comment (November 9, 2026): "add a search in main queue so that when you search for a player it actually highlights that card"

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: empty field (no change); matches found (hit and dim cards, result line); no match (all cards dim, muted line).
- Copy: placeholder “Find a player in the queue”; “N queued match with NAME” / “N queued matches with NAME”; “Not in any queued match”.
- Tokens: existing only (`--warn`).
- Known differences: none

## Reuse plan
- Reuses as is: input, queue match card
- Extends: queue match card gets `hit` / `dim` states and a highlighted face
- New: none
- Shares work with: none

## Docs updated
- Business logic: none (view-only)
- Database design: none
- Screen docs: docs/screens/product/modules/queue/match-queue.md — Q-QUEUE “Find a player”

## Real app work
- Search field above the Main Queue grid (UI state only); `hit` / `dim` card states; scroll the first hit into view.
