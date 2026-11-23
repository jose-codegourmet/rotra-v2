# Queue app: Settings court Until is always editable and drives Follows session end; time fields fill the card

Status: TICKETED — #1072
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `liveSettings()` `courtTimePickers()`; CSS `.ls-times .dt-field`
Route: /queue/sessions/s-tonight?tab=settings, /queue/sessions/s-tonight/prepare
Screen ID: Q-CONSOLE, Q-PREPARE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: settings court cards, time field
Supersedes: the disabled Until in 2026-11-19-queue-time-picker-standard.md
Superseded by: none

## What changed
- Before: with **Follows session end** ticked, Until was greyed out. The time fields also stopped at 260 px wide,
  leaving empty space on the right of wider court cards.
- After:
  - Until is always editable. Picking a time other than the session end unticks **Follows session end** (toast
    “COURT open until TIME”). Picking the session end itself ticks it again (toast “COURT follows the session end”).
    The checkbox still works by hand as before.
  - In the court cards, the From and Until fields fill their column to the card's right edge.

## Why
- Owner artifact comment, November 19, 2026, on a Settings court card: “regardless if checkbox is checked you can still
  edit the until time and it should uncheck if not follows session end and the input fields have white space on the
  right side please fix that”.

## Like for like
- Compare at: 375 px, 1280 px and 1440 px, dark and light.
- States: ticked then pick another Until (unticks); pick the session end (ticks); untick by hand.

## Copy
- Toasts: “COURT open until TIME”, “COURT follows the session end”.

## Open
- None.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Settings court times)
