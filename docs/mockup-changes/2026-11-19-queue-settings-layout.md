# Queue app: the live Settings tab is rearranged into an even grid

Status: IN MOCK APP — #1071
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `liveSettings()`, console `?tab=settings`; CSS `.ls-grid`, `.ls-row`, `.ls-courts`, `.ls-times`
Route: /queue/sessions/s-tonight?tab=settings
Screen ID: Q-CONSOLE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: settings cards (also used by the preparation Settings tab)
Supersedes: none
Superseded by: none

## What changed
- Before: cards flowed in an auto-fill grid of uneven heights (Players, Game rules, Costs in a row, Notes alone
  below), courts wrapped three and one, values sat far right of their labels, and **All session settings** was a
  lone button under everything.
- After:
  - **Courts** fill one row on wide screens (four courts across at 1280 px). Each court's **From** and **Until** sit
    one under the other with the label on the left.
  - Below, a 2×2 grid of even-height cards: **Game rules** | **Players**, then **Costs** | **Notes**. One column at
    760 px and narrower.
  - Rows: the label in a left column, the value (semi-bold) left-aligned next to it, any note under the value.
  - **Notes** always shows; empty reads “No notes for tonight.”
  - **All session settings** moved to the right of the **Setup** heading.
- The preparation Settings tab uses the same cards and picks up the grid and row style.

## Why
- Owner artifact comment, November 19, 2026, on the live Settings tab: “can you please re arrange and update the
  layout. this looks like all over the place”.

## Like for like
- Compare at: 375 px, 768 px and 1280 px, dark and light.
- States: 2, 4 and 6 courts; with and without costs; with and without notes.

## Copy
- Empty notes: “No notes for tonight.”

## Open
- None.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Settings row)
