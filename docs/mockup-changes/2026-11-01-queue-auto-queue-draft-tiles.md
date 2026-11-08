# Auto Queue drafts look like queue tiles and are picked like players

Status: IN MOCK APP — #321 (PR #366)
Date: 2026-11-01
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Live console › Queue tab › Auto Queue (`autoWorkspace`, `draftTile`, `autoMoreMenu`, `autoSelectionBar`)
Screen ID: Q-AUTO

## What changed
- Drafts: plain cards with a native "Select Doubles" checkbox, a sentence and a long dot-joined stats
  line → the Main Queue tile (`.qtile`) in a `.qgrid`: Draft chip in place of #position, format chip,
  avatars, short names, VS and the status line. No handle and no Start / Edit / Remove. The border is dashed until
  picked. Draft tiles are at least 230 px wide so chips fit.
- Picking: the whole tile is a `role="button"` / `aria-pressed` toggle (tap, Space or Enter), like the
  Players tiles: accent border, inset ring and a pick-order badge.
- Stats: per-player chips under each name ("3 played", "1 queued", "2 suggested" only when another
  draft has them too, "Playing now" in warn). Zeros and the "Available Players ·" prefix are gone.
- Controls: five equal buttons and a helper sentence → one primary (**Generate N matches**, then
  **Generate again**) plus a ⋯ menu with Replace unselected, Remove unselected and Clear this tab
  (danger), each with a one-line description.
- Commit: the two buttons under the list → the Players `.selbar` ("Selected drafts"): faces of the
  picked drafts' players, "N selected", Add all N, Clear and the primary **Add N to Main Queue**.
- Batch result: a full batch ("Made 4 of 4 matches.") is a neutral chip; shortfalls and Catch Up notes
  are info notices.

## Why
- Jose (Nov 1, 2026, #321 and its comment): drafts should look like the queued matches and picking
  them should feel like picking players; the five-button row had no hierarchy.

## Docs updated
- Business logic: none needed (generation and transfer rules unchanged)
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/match-queue.md — Q-AUTO draft tiles, picking,
  controls, selection bar and batch results

## Real app work
- Done in #321: `MatchCard` `draft` prop and variants, `OverflowMenu` descriptions and `align`,
  `SelectionBar` `count` / `primaryLabel` / `ariaLabel`, `AutoQueueWorkspace` rebuilt on them, and an
  `unselect-all` Auto Queue edit in `@rotra/data` for the bar's Clear.
