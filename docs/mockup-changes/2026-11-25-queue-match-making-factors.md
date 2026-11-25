# Queue app: Generate matches picks drafts by Whose turn, Fresh faces and Even game

Status: NEW
Date: 2026-11-25
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Generate Queue (all five tabs) › draft tile reason line; helpers `streakOf`, `nightGames`, `restAfter`, `tonightLevel`, `freshPick`, `cmpKeys` and the loop in `generateDrafts`; `splitTeams` (new optional level function)
Route: /queue/sessions/s-tonight (console: Generate Queue)
Screen ID: Q-AUTO
Artifact: none
Components: auto-queue-workspace, match-card
Supersedes: none
Superseded by: none

## What changed
- **Before:** each tab sorted players by its own order (load, wait, Catch Up target, Plan Ahead finish) and took the
  first 4 (or 2); teams were split by the smallest difference in assigned level; the reason line said
  "Suggested by Generate matches" (or the bagging pair).
- **After:** three checks in priority order, a ladder (a higher check always wins), in every tab, Catch Up included:
  1. **Whose turn.** Rested players first: a player who has played **2 games in a row** (Hard mode **3**; a player
     with a handicap tonight one fewer) is exhausted and is used only when the match can't be made otherwise. Then
     each tab's own order as before. "In a row" = their completed, On court and Playing matches with no started match
     in between that they sat out (a match that starts on another court while they are still playing doesn't count as
     sitting out). Within a batch, a player in a draft adds one to their streak and a player left out of a draft
     counts as sitting it out. Longest Wait now orders by matches rested, then minutes.
  2. **Fresh faces.** Nobody from either of the player's last 2 games (completed, On court, Playing, or an earlier
     draft in this batch) as partner or opponent. Players more due than the last one Whose turn would pick always
     play; among the players tied with that last one, the first group with no repeat wins. Only when none exists is
     the repeat kept. A bagging pair still wins over Fresh faces for that pair.
  3. **Even game.** Teams are split by tonight's level: level + 0.25 × (wins − losses tonight, from completed counted
     games), capped at ±1 level (no level counts as 4). Chill and Fair easy-game percentages unchanged.
- **Reason line** on each draft tile (the existing info status line): the bagging pair or Whose turn, then Fresh
  faces when it mattered, joined by " · ".

## Why
- Owner decision, November 25, 2026: [D-2026-11-25-01](../mvp/decisions/2026-11-25.md#d-2026-11-25-01). Fair turns
  win over close games; no long-term win rate (rank math is still open).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: draft with rested players; draft that had to use an exhausted player; draft where a repeat was avoided
  (partners, opponents); draft that couldn't avoid a repeat; bagging draft; Catch Up draft; Plan Ahead draft with a
  busy player (shows "Waits for Court N", unchanged).
- Copy (reason line, first part): "Rested N match" / "Rested N matches", "Fewest games", "Longest wait",
  "Below N game" / "Below N games" (Catch Up), "Not enough rested players", or the existing
  "Bagging pair: A and B are partners". Second part: "Avoided repeat partners", "Avoided repeat opponents",
  "Couldn't avoid a repeat". Example: "Rested 2 matches · Avoided repeat partners".
- Tokens: none (the existing muted info status line).
- Known differences: none.

## Reuse plan
- Reuses as is: match-card — the draft status line slot (new text only).
- Extends: auto-queue-workspace — none visually; the generation logic lives in `@rotra/data` (and later the Go shared
  queue rules, [architecture](../architecture.md#shared-queue-rules-go-and-webassembly)).
- New: none.
- Shares work with: [2026-11-25-queue-handicap-tonight](2026-11-25-queue-handicap-tonight.md) (the handicap shortens
  the exhaustion limit), [2026-11-25-queue-almost-done-switch](2026-11-25-queue-almost-done-switch.md) (Plan Ahead pool).

## Docs updated
- Business logic: [queueing](../business_logic/product/queue/modules/queueing/README.md) — new "Match making factors"
  section; "Previous prototype reference heuristic" marked replaced for Generate matches (Main Queue regeneration
  still uses it); [open decisions](../business_logic/product/open-decisions.md) — pairing note.
- Database design: [matches-queue](../database_design/product/queue/modules/matches-queue.md) — nothing new stored;
  everything is derived from matches, participations and decisions.
- Screen docs: [match queue](../screens/product/modules/queue/match-queue.md) — draft tile reason line;
  [screen open decisions](../screens/product/open-decisions.md) — pairing row note.
- Terms: [product terms](../product-terms.md) — Match making factors.

## Real app work
- `@rotra/data` (and the planned Go rule with its `@rotra/rule-cases` cases): games-in-a-row streak, exhaustion
  limit by mode and handicap, last-2-games clash check inside Whose turn ties, tonight's level for the team split,
  and the reason text. Decided-math tests for the streak and the tie window.
- `@rotra/ui` match-card: no change beyond the reason text it is given.
