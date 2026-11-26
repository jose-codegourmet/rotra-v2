# Session done takes the planned tubes off inventory stock

Status: IN MOCK APP — PR #1116
Date: 2026-11-26
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Inventory (note under the list); Session done
Route: /queue/inventory
Screen ID: Q-INVENTORY
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: inventory-screen
Supersedes: none
Superseded by: none

## What changed
- Session done now deducts each planned shuttle line's tubes from that inventory item, never below zero. No new control.
- Inventory note: "Stock isn't deducted automatically yet; adjust it with − and + after a session." → "Session done takes the planned tubes off stock; adjust it with − and + if a night used a different amount."

## Why
- Owner, November 26, 2026: "this should deduct the items once the session is done" ([D-2026-11-26-01](../mvp/decisions/2026-11-26.md#d-2026-11-26-01)). Built in the mock and real app in #1115; this log brings the mockup and the Inventory note in line.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: default only (note text).
- Copy: "Shuttlecock prices here fill in the session cost estimate. Session done takes the planned tubes off stock; adjust it with − and + if a night used a different amount."
- Tokens: none
- Known differences: none
