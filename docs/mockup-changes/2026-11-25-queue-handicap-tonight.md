# Queue app: Handicap · tonight in the live Edit player sheet

Status: NEW
Date: 2026-11-25
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › console Players tab › Edit player (pencil) › section "Handicap · tonight" (`SHEETS.editLive`, `hcFigure`, `HC_SPOTS`, `HC_FIGURE`, actions `hcToggle`, `saveEditLive`); Players card icon (`playersPane`, `hcText`); cleared in `confirmDone`; used by `restAfter` in Generate matches
Route: /queue/sessions/s-tonight (console: Players)
Screen ID: Q-POOL, D-EDIT-LIVE-PLAYER, Q-AUTO
Artifact: none
Components: edit-live-player-sheet, player-pool-card, chip
Supersedes: none
Superseded by: none

## What changed
- **Edit player (live):** before, the sheet had Profile and Tonight. After, a third section **Handicap · tonight**:
  - A simple front-facing person figure (inline SVG in token colours; the drawing about 180 px tall inside a
    200 × 198 px area so every spot keeps a 44 × 44 px tap area without overlapping). Small "Right" and "Left" labels at
    the top corners: the figure faces you, so the player's left is on your right.
  - Eleven spots, each a real button with `aria-pressed` and its name as accessible name and title: Left shoulder,
    Right shoulder, Left elbow, Right elbow, Left wrist, Right wrist, Lower back, Left knee, Right knee, Left ankle,
    Right ankle. A spot is a small dot (a short pill for Lower back); marked spots fill with the warning colour, tap
    again to clear.
  - Under the figure, one chip per marked spot in figure order ("Left knee" with a remove ×, accessible name
    "Clear left knee"), or a plain "No handicap" chip.
  - Hint: "Tap a spot to mark it, tap again to clear. Generate matches rests NAME after 1 game in a row (Hard mode: 2).
    Only you see it, and it clears when the session ends."
  - Saved with **Save changes** like the rest of the sheet ("Changes saved · NAME"; "No changes" when nothing changed).
- **Players card:** a small warning-colour icon after the name when a handicap is set; title and accessible name
  "Handicap: left knee, lower back" (marked spots, lower case, in figure order).
- **Effect:** in Generate matches, a player with any handicap is exhausted after 1 game in a row instead of 2 (Hard 2
  instead of 3). Nothing else changes.
- **Session only:** Session done clears every handicap. Never on the public page, the Player app, results or exports.

## Why
- Owner decision, November 25, 2026: [D-2026-11-25-03](../mvp/decisions/2026-11-25.md#d-2026-11-25-03).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: no handicap ("No handicap" chip, no card icon); one spot; several spots (chips wrap); hover and keyboard
  focus on a spot (focus ring); a spot removed from its chip; Save changes with and without a change; the Players card
  with the icon and its title.
- Copy: "Handicap · tonight", "No handicap", the eleven spot names, "Clear SPOT" (chip button), "Right", "Left", the
  hint above, card title "Handicap: SPOT, SPOT".
- Tokens: none new (`--warn` for marked spots and the icon, `--fg3` for the figure, `--fg2` and `--surface` for empty
  spots).
- Known differences: none.

## Reuse plan
- Reuses as is: chip and the exemption-list chip with a remove button (`ex-chip`); the alert icon for the card icon.
- Extends: edit-live-player-sheet — a Handicap · tonight section; player-pool-card — an optional handicap icon after
  the name.
- New: a body-figure spot picker inside edit-live-player-sheet (nothing in `@rotra/ui` picks spots on a figure).
- Shares work with: [2026-11-25-queue-match-making-factors](2026-11-25-queue-match-making-factors.md) (the exhaustion
  limit).

## Docs updated
- Business logic: [players](../business_logic/product/queue/modules/players/README.md) — new "Handicap tonight"
  section; [queueing](../business_logic/product/queue/modules/queueing/README.md) — the shorter exhaustion limit.
- Database design: [sessions-roster](../database_design/product/queue/modules/sessions-roster.md) — proposed
  `session_players.handicap_spots` (text array of fixed codes, cleared at Session done).
- Screen docs: [dialogs](../screens/product/dialogs.md) — D-EDIT-LIVE-PLAYER section; [session console](../screens/product/modules/queue/session-console.md)
  — the Players card icon. [Players and roster](../screens/product/modules/queue/players-roster.md): none needed (it
  doesn't cover the live Players card).
- Terms: [product terms](../product-terms.md) — Handicap · tonight.

## Real app work
- `packages/db` / `@rotra/data`: `handicap_spots` on the roster entry (migration needs a decision), saved with the
  Edit player command, cleared by Session done, kept out of every public read and export; Generate matches reads it.
- `@rotra/ui`: the figure spot picker and chips in edit-live-player-sheet; the icon on player-pool-card; stories in
  both themes.
