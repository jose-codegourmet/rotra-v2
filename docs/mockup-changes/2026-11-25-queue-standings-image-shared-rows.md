# Standings images: one row per position, and previews that are the images

Status: IN REAL MODE — #1135
Date: 2026-11-25
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Results › Standings slide (`slideStandings`) and the Download images sheet (`SHEETS.export`)
Route: /queue/sessions/x-full/results (then Download images)
Screen ID: Q-RESULTS, Q-EXPORT
Artifact: none
Components: result-slide-frame, export-images-sheet (export-frame-preview)
Supersedes: none (replaces the "share images keep one row per player" part of 2026-11-18-queue-shared-standings-positions.md)
Superseded by: none

## What changed
- **Standings image and slide.** Before: one row per player, so a shared position repeated its number
  ("4 Dexter", "4 Dhin", "4 Erech" …). After: one row per position, like the Results table. The
  players' faces sit stacked, then their names: "Andi Cruz & Mika Soriano" for two, "Kat Lim, Marco
  Lopez, Miguel Santos" for three or more. A position shows at most four faces; five or more show three
  faces and a "+N" chip, so the names keep their width. The W, L and G cells are the position's (G shows
  a range, "4–5", when counted games differ inside it, as on the Results table).
- **Two tied names read "A & B"** everywhere tied names are listed (the Results table and leaderboards
  use the same helper). Three or more stay comma-separated.
- **Download images previews.** Before: each frame was a tiny text list (club name, title, one name
  per line) that clipped names. After: each frame is the image itself, scaled down (Story 480×853 at
  0.225, Feed 480×600 at 0.3), so the preview shows exactly what downloads.
- **Paging.** Before: 14 players per Story image, 10 per Feed image. After: 14 rows per Story
  image, 9 per Feed image, one row per position. A position with more than three names counts one row
  per three names, and a position never splits across images. Titles read "Standings · 1 of 3" when
  there is more than one image.

## Why
- Owner, November 25, 2026, on the real app's Download images sheet and standings image: "this looks
  unpolished. same standings should be 1 ( ) ) ) player name 1, player name 2, player name 3 /
  2 ( ) ) player name 4 & player name 5". The "( ) ) )" is the stacked faces.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: single-player position (the leader row stays accent), 2-way tie ("&"), 3-way tie (commas),
  5+ way tie (three faces + "+N"), G range inside a position, empty standings ("No counted games were
  recorded in this session."), Story and Feed previews, one and several Standings images, Awards and
  Off Day previews (no Share button inside an image).
- Copy: "A & B" (two tied names); "Standings · N of M" (image title when standings span several
  images); "+N" (more faces). Unchanged: "N images. Long standings continue onto extra images so every
  name stays readable."
- Tokens: none (uses `--bg`, `--surface`, `--fg2`, `--accent`).
- Known differences: none.

## Reuse plan
- Extends: result-slide-frame — standings rows grouped by position with a stacked-faces cell (reuse the
  Results table's stacked faces and tied-names helper, not a new list).
- Extends: export-images-sheet / export-frame-preview — render each preview from the same slide
  component as the download, scaled; delete the text-list preview.
- Shares work with: 2026-11-18-queue-shared-standings-positions.md (same grouping), 2026-11-19-queue-standings-no-gaps.md.

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/results/README.md — shared positions are one
  row on images too; "A & B" / "A, B, C"; paging 14 / 9 rows, positions never split; preview is the images.
- Database design: none needed (display only).
- Screen docs: docs/screens/product/modules/queue/results-sharing.md — Standings slide rows; Q-EXPORT
  paging, titles and previews.

## Real app work
- `packages/ui` result-slide-frame: standings rows grouped by position with stacked faces and tied names.
- `packages/ui` export-images-sheet: previews are scaled renders of the downloaded images; paging by rows
  per position (14 Story, 9 Feed), never splitting a position; "Standings · N of M" titles.
- `packages/data` session-result rules: the shared tied-names joiner ("A & B", "A, B, C") if the real
  app has one.
