# Queue app: public session Details as cards

Status: IN MOCK APP — #1071
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `viewPublic` Details tab, `.pub-details`, `.pf-lead`, `.pf-big`, `.pf-grid`, `.pf-tile`, `.pf-l`
Route: /queue/s/<slug> (Details tab)
Screen ID: Q-PUBLIC
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: public details cards and fact tiles
Supersedes: none
Superseded by: none

## What changed
- Before: Details was one card holding a long label–value list.
- After:
  - **Lead cards:** **When** (date, then time range · duration) and **Where** (venue, then address).
  - **Fact tiles:** Courts, Formats, Mode, Levels, Scoring, Minimum, Payment, and Results when the session isn't
    recorded. Each tile has a small uppercase label, a bold value and one muted line.
  - **Notes:** their own card.
  - **Layout:** the tiles fill the row on wide screens and sit two per row on phones.

## Why
- Owner artifact comment, November 19, 2026, on the public page's Details: “should be cards or layout them better”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: with and without an address, notes, payment, restrictions; not recorded; free session.

## Copy
- “When” · “Where” · “N courts” · “N games” · “per player” · “per player · paid at the venue” · “Free” · “Not recorded” ·
  “Notes”

## Open
- None.

## Docs updated
- screens/product/modules/queue/public-session.md (Details as cards)
