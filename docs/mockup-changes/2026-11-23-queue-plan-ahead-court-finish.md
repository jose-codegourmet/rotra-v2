# Queue app: Plan Ahead and the Playing court card estimate when each court finishes, from the scoring mode

Status: TICKETED — #1061
Date: 2026-11-23
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › console Courts (Playing court card), Generate Queue › Plan Ahead (tab description, sort, draft tile status line); helpers `SCORING` (`typical`, `long`), `finishOf()`
Route: /queue/sessions/s-tonight (console: Courts; Generate Queue › Plan Ahead)
Screen ID: Q-CONSOLE, Q-COURTS, Q-AUTO
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: court-card, auto-queue-workspace, match-card
Supersedes: none
Superseded by: none

## What changed
- Each scoring mode gets an expected match length in minutes, **typical** and **long** (owner confirmed all five, November 23, 2026):

  | Mode | Typical | Long |
  |---|---|---|
  | 16/31 | 15 | 25 |
  | 16/31, no deuce | 15 | 18 |
  | 11/21 | 10 | 15 |
  | 11/21 × 3 | 25 | 35 |
  | 21 × 3 | 25 | 30 |

- **Expected finish** (estimate from time only; ROTRA has no live score). For a Playing match with `p` minutes
  played: `p < typical − 3` → "Ends in about N min" (N = typical − p, at least 1); `typical − 3 ≤ p < typical` →
  "Finishing soon"; `typical ≤ p < long` → "Could end any time" (deuce modes add " · may be in deuce");
  `p ≥ long` → "Running long". A Getting ready (On court) match is "Not started yet" and counts the full typical length.
- **Playing court card** (console): before, the card had only "FORMAT · Match N · M min". After, one more small
  line under it with the expected finish. Finishing soon is accent, Running long is warn, the others muted; the
  words always carry the meaning. Merged 5v5 cards get the same line. The 30-second console refresh redraws it.
- **Plan Ahead pool and sort** (owner, November 23, 2026: "plan ahead should consider the games that are finishing
  soon"): before, Plan Ahead took every busy player and put free players first. After, a busy player is used only when
  their court is Finishing soon, Could end any time or Running long; courts still mid-game (Ends in about N min) or
  Getting ready are left out. Free and finishing-soon players rank together by load (games played plus queued);
  ties go to the soonest free (expected minutes left: free, Could end any time and Running long = 0). Other tabs unchanged.
- **Draft tile status line:** before, "A player is on court or playing now; this match waits until they are free."
  After, the court the draft waits for: the busy match that finishes last among the draft's players, e.g.
  "Waits for Court 2 · ends in about 3 min". With busy players on two or more courts: "Waits for Court 1 and
  Court 2 · Court 2 ends in about 8 min". Info icon and muted tone stay; warn tone when that match is running long.
- **Plan Ahead description:** "Also uses players whose court is finishing soon, ranked with free players. Their
  matches wait until that game ends."
- **Plan Ahead empty and result copy:** with players present but none free and no court finishing soon, "No one is
  free and no court is finishing soon. Try again in a few minutes." The short-batch result says "not enough free or
  finishing-soon players" (was "present"). Available Players' empty copy now points to Plan Ahead "to include players
  whose court is finishing soon" (was "who are mid-game").

## Why
- Decisions: [D-2026-11-23-08](../mvp/decisions/2026-11-23.md#d-2026-11-23-08), [D-2026-11-23-09](../mvp/decisions/2026-11-23.md#d-2026-11-23-09).
- Owner, November 23, 2026: "with Plan Ahead generation we should be able to know which courts are about to
  finish or is set to finish depending on the scoring mode that was set for the session".
- The 16/31 lengths come from the owner's shuttle cost sheet: 15 min average, 20–25 min with deuce.

## Open items
- The lengths for all five modes were confirmed by the owner on November 23, 2026 (16/31 from the owner's shuttle cost sheet).
- The minimum games estimate still uses the fixed 15/20 min and does not follow the scoring mode
  ([open decisions](../business_logic/product/open-decisions.md), "Scoring modes: match length and minimum games").
- ROTRA has no live score, so a deuce can't be detected; "may be in deuce" is only a hint from time.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Playing card in each phase (mid, finishing soon, could end any time with and without deuce, running long);
  merged 5v5 Playing card; draft tile waiting for one court, for two or more courts, for a Getting ready court, and
  for a running-long court (warn); Plan Ahead pool with free players, a Finishing soon court (used), a mid-game court and a Getting ready court (both left out); Plan Ahead empty with nobody free and no court finishing soon.
- Copy:
  - Court card: "Ends in about N min", "Finishing soon", "Could end any time", "Could end any time · may be in deuce", "Running long"
  - Draft tile: "Waits for Court 2 · ends in about N min", "Waits for Court 2 · finishing soon", "Waits for Court 2 · could end any time", "Waits for Court 2 · running long", "Waits for Court 2 · not started yet"; on two or more courts "Waits for Court 1 and Court 2 · Court 2 ends in about N min" (the court that finishes last, then the same phase wording; three courts read "Court 1, Court 2 and Court 3"; a merged 5v5 match reads "Court 1 + Court 2")
  - Plan Ahead description: "Also uses players whose court is finishing soon, ranked with free players. Their matches wait until that game ends."
  - Plan Ahead empty: "No one is free and no court is finishing soon. Try again in a few minutes."
  - Short batch: "Made {k} of {n}: not enough free or finishing-soon players for another match."
  - Available Players empty: "No one is free to play right now. Try Plan Ahead to include players whose court is finishing soon."
- Tokens: none (existing `--accent`, `--warn`, muted text)
- Known differences: none

## Reuse plan
- Reuses as is: match-card — the draft status line slot (new text and tone only)
- Extends: court-card — an expected finish line on the Playing card, with its tone
- Extends: auto-queue-workspace — the Plan Ahead description and sort (container logic in `@rotra/data`)
- New: none
- Shares work with: [2026-11-18-queue-scoring-modes](2026-11-18-queue-scoring-modes.md) (the scoring table)

## Docs updated
- Business logic: [queueing](../business_logic/product/queue/modules/queueing/README.md) — Plan Ahead orders players in play by their court's expected finish; [open decisions](../business_logic/product/open-decisions.md) — match length per mode now in the mockup, still open.
- Database design: none needed (nothing stored; computed from the session's scoring mode and the match start time).
- Screen docs: [match queue](../screens/product/modules/queue/match-queue.md) — Plan Ahead row and draft status line; [session console](../screens/product/modules/queue/session-console.md) — the expected finish line on the Playing card.
- Terms: [product terms](../product-terms.md) — Expected finish.

## Real app work
- `@rotra/schema/scoring` (or `@rotra/data`): typical and long minutes per mode and one expected-finish function.
- `@rotra/ui`: court-card expected finish line; match-card draft status text; stories for each phase.
- `@rotra/data` / `apps/queue`: Plan Ahead pool limited to free and finishing-soon players, ranked together by load then expected minutes left; the draft status line from the busy match that finishes last.
