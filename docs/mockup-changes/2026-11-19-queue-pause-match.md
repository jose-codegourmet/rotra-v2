# Queue app: Pause match takes a playing match back to Getting ready

Status: TICKETED — #1042
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `courtsPane()` Playing card, sheet `match` (Q-ACTIVE-MATCH), action `pauseMatch`
Route: /queue/sessions/s-tonight (Courts tab)
Screen ID: Q-CONSOLE, Q-ACTIVE-MATCH
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: court card, match sheet footer (reuse buttons; pause icon new)
Supersedes: none
Superseded by: none

## What changed
- **Pause match** (secondary button with a pause icon) on the Playing court card, next to Open match, and first in the
  Q-ACTIVE-MATCH footer.
- It takes the match back to Getting ready on the same court(s) at once: the start time clears, players, sides and
  substitutions stay, nothing is recorded. Toast “Match N paused · back to Getting ready on Court X”. **Start match**
  starts it again with a fresh start time.

## Why
- Owner artifact comment, November 19, 2026, on a court card: “add a pause match button. because sometimes you
  accidentally press start match”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; a single-court and a merged two-court match; pausing from the card and
  from the sheet; starting again.

## Open
- The name: it works as “undo start”, not a timer pause. If a real pause (stop the clock mid-game, keep playing later)
  is wanted too, that is a different feature.
- Whether to ask for confirmation when a match has been playing for a while (the mockup never asks).

## Docs updated
- docs/business_logic/product/queue/modules/matches/README.md (Lifecycle)
- docs/screens/product/modules/queue/match-control.md (Q-ACTIVE-MATCH)
- docs/screens/product/modules/queue/session-console.md (court card states)
