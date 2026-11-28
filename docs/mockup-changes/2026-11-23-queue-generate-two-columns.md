# Queue app: Generate Queue in two columns on wide screens

Status: IN MOCK APP — #1061
Date: 2026-11-23
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › console Generate Queue (`autoWorkspace`; CSS `.gq-cols`, `.gq-main`, `.gq-side`, `.gq-drafts`)
Route: /queue/sessions/s-tonight (console: Generate Queue)
Screen ID: Q-AUTO
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: auto-queue-workspace
Supersedes: none
Superseded by: none

## What changed
- Before: one column. Heading and Bagging mode switch, the intro line, Bagging pairs (when on), Exemption list, then the
  strategy tabs, count, Generate, results and drafts.
- After: the heading, Bagging mode switch and intro line stay full width. Below them, from 1280 px wide:
  - **Column 1** (fills the rest): strategy tabs (Available Players, Plan Ahead, Longest Wait, Fewest Games, Catch
    Up), description, How many matches, Catch Up target, Generate, result line, the draft grid and the selection bar.
  - **Column 2** (300–360 px): Bagging pairs (only when Bagging mode is on), then Exemption list.
- Narrower than 1280 px it stacks as before, the column 2 cards first.
- **Column 1 is a card** (owner artifact comment, same day: "put this in a box or paper"): the strategy tabs, count,
  Generate, result line, drafts and selection bar sit in one surface card (16 px padding, 14 px gaps), matching the
  Bagging pairs and Exemption list cards beside it. The heading and intro stay outside it.
- Drafts now fill their column (`repeat(auto-fill, minmax(min(100%, 230px), 1fr))`) instead of counting columns from
  the window width.

## Why
- Owner artifact comment, November 23, 2026: "can we make this split into 2 columns · column 1 available players tabs,
  generations · column 2 bagging pairs (if on), exemption list".

## Open items
- The breakpoint is 1280 px of window width, so the left column has room for three drafts beside the rail. Below that,
  two columns made the draft area too narrow (about 320 px at 1024 px).

## Like for like
- Compare at: 375 px and 1280 px (and 1440 px), dark and light.
- States: Bagging mode off (column 2 has only the Exemption list) and on; with and without drafts; Catch Up target.
- Copy: unchanged.
- Tokens: none.
- Known differences: none

## Reuse plan
- Extends: auto-queue-workspace — a two-column layout with the side cards in an `aside`.
- New: none

## Docs updated
- Business logic: none needed (layout only).
- Database design: none needed.
- Screen docs: [match queue](../screens/product/modules/queue/match-queue.md) — Generate Queue layout.
- Terms: none.

## Real app work
- `@rotra/ui` auto-queue-workspace: the two-column layout at 1280 px and up; drafts fill their column.
