# Queue app: Correct Queue Time Format: waiting times and the overdue line cap at hours, then “long time ago”

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `queueTime()`, `endStatus()`, `queuePane()` faces, `playersPane()` cards
Route: /queue/sessions/s-tonight (Courts, `?tab=queue`, `?tab=roster`)
Screen ID: Q-CONSOLE, Q-QUEUE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: one shared time formatter (no new component)
Supersedes: none
Superseded by: none

## What changed
- One rule, **Correct Queue Time Format**: under 60 minutes “N min”; from 60 minutes whole hours “N h” (rounded down);
  from 24 hours “long time ago”.
- **Players cards:** “Queued · #1 · 3645 min wait” → “· 2 h wait”, and from 24 hours “Queued · #1 · long time ago”.
- **Queued match faces** (Main Queue and the live queue strip): the wait under each name, “3634 min” → “2 h” or
  “long time ago”. The red and amber colours still start at 16 and 10 minutes. Screen-reader text follows the same rule.
- **Overdue line and banner:** “Planned end passed 59 h 10 min ago” → “Planned end passed 3 h ago”, and from 24 hours
  “Planned end passed long time ago”. Time left before the end is unchanged.
- **Extended the same day** (owner artifact comment on a court card, “time format not correct”, on “Match 17 · 3662 min”):
  the rule now covers every elapsed time in the console as well:
  - playing court line “Match 17 · 45 min” → “· 2 h”, and from 24 hours “· started long time ago”;
  - free-court chip “Free · 2 h” / “Free · long time ago”; the replay court chip “#N · …”;
  - Q-ACTIVE-MATCH “· N min in” (left out from 24 hours), the substitution hint “Started … ago”;
  - the profile card's tonight status “Free · …” and the suggestion dialog's waits.

## Why
- Owner, November 19, 2026, in the session with screenshots of the Players cards, the queued matches and the overdue
  banner: minutes read badly when they grow; after 60 minutes show hours, after 24 hours show “long time ago”. Owner
  named it “Correct Queue Time Format” and limited it to those parts of the screens.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: a wait under an hour, between 1 and 24 hours, and over 24 hours, on each of the three places.

## Copy
- “N min”, “N h”, “long time ago”; card “· N h wait”, “· long time ago”; banner “Planned end passed N h ago”,
  “Planned end passed long time ago”.

## Docs updated
- docs/screens/product/modules/queue/match-control.md (elapsed times)
- docs/screens/product/modules/queue/session-console.md (Overdue banner, Player card)
- docs/screens/product/modules/queue/match-queue.md (Wait timer)
- docs/business_logic/product/queue/modules/sessions/README.md (Overdue reminder)
- docs/product-terms.md (Planned end)
