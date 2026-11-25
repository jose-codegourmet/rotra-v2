# Players cards and Main Queue: one status pill per player

Status: NEW
Date: 2026-11-25
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › live session › Players cards (`pc3`) and Main Queue tiles (`qtile`, the line under each face); helper `statusPill()`
Route: /queue/sessions/<live session>?tab=roster and ?tab=queue
Screen ID: Q-POOL (session-console.md), Q-QUEUE (match-queue.md)
Artifact: none
Components: player-pool-card, match-card (queue tile faces), a new status pill
Supersedes: none (changes the wording of 2026-11-19-queue-correct-time-format.md for these two places only)
Superseded by: none

## What changed
- **Players cards.** Before: a status line, "Free · 0 min wait", "Queued · #1 · 3 h wait", "Playing ·
  Court 1", "On court · getting ready · Court 2" or "Away". After: one pill. **Wait 2m** when free,
  **In queue 2m** when in a waiting match (the minutes are still their wait since their last game),
  **Playing 1m** when playing (minutes since the match began; hovering shows "Playing on Court 1"),
  **Getting ready** when on court but not started (hover names the court), **Away** when not here.
  The queue position (#P) no longer shows on the card.
- **Main Queue.** Before: under each face a bare timer ("3 h"), "Playing", "On court" or "Not
  here". After: the same pill. A present player in that queued match who is not on court reads
  **In queue Nm**; one already playing elsewhere reads **Playing Nm**.
- Times are short: "2m", "1h 5m", "1d+" (24 hours or more). Wait and In queue keep the warning
  colour from 10 min and the error colour from 16 min, now on the pill's border and text. Playing and
  Getting ready are accent; Away is muted with a dashed border.

## Why
- Owner, November 25, 2026, on the real app's Players and Main Queue tabs: "to save space … it
  should just say pill label (wait 2m); if playing (playing 1m) hovering this should show what court
  this person is playing; and when in the main queue say (in queue 2m), except it will still say the
  x amount of min waiting".

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Wait under 10 min, 10–15 min (warning), 16 min+ (error), 1h+ and 1d+; In queue in the
  same three tones; Playing with its court tooltip; Getting ready; Away; a Main Queue face that is
  playing elsewhere; prepared session (no pills, as before: no timers before Start).
- Copy: "Wait Nm", "In queue Nm", "Playing Nm", "Getting ready", "Away"; tooltips "Free · waiting
  Nm since their last game", "In the Main Queue · waiting Nm since their last game", "Playing on
  Court N", "Getting ready · Court N"; accessible name of a playing pill "Playing on Court N for Nm".
- Tokens: none (uses `--warn`, `--error`, `--accent`, `--accent-subtle`, `--fg2`, `--fg3`,
  `--border-strong`, `--bg`).
- Known differences: none.

## Reuse plan
- New: a StatusPill (small pill with tone: default, warn, error, play, away) in `@rotra/ui`, used by
  PlayerPoolCard and the Main Queue MatchCard faces. Check the existing Chip/Pill first and extend it
  if it fits.
- Extends: PlayerPoolCard — the status line becomes the pill; MatchCard — the timer under each face.
- Shares work with: 2026-11-19-queue-correct-time-format.md (the time wording here is the short form).

## Docs updated
- Business logic: none needed (the wait and playing times are unchanged; only the wording is).
- Database design: none needed.
- Screen docs: docs/screens/product/modules/queue/session-console.md (player card status) and
  docs/screens/product/modules/queue/match-queue.md (Status pill, which replaces the Wait timer line).

## Real app work
- One status pill shared by PlayerPoolCard and the Main Queue faces, with the short time format and
  the court tooltip for Playing and Getting ready.
