# Queue app: the live Settings tab shows the setup as cards

Status: IN MOCK APP — #1071
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `liveSettings()` (from `prepOverview()` when the session is live)
Route: /queue/sessions/s-tonight?tab=settings
Screen ID: Q-CONSOLE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: card, chip, a stat tile and a label-value row (new, small), button row
Supersedes: none
Superseded by: none

## What changed
- Before: one Setup card with a long label list (Courts, Formats, Requests, Mode, Scoring, Record games, Minimum, Roster,
  Costs, Notes), “Fixed after start” repeated on several lines, and the four buttons at the bottom.
- After: a **Setup** heading with one line of help, then a grid of cards (one column on phones):
  - **Courts · N**: each court on its own row with its times and a chip (Set time / Follows session end); **Courts and time**.
  - **Players**: Confirmed and Present as big counts; Match requests formats; **Add player**, **Match requests · N**.
  - **Game rules** with one “Fixed after start” chip: Minimum games and Record games as counts; Formats, Mode, Scoring rows.
  - **Costs**: Each player pays and Estimated total as counts; Break-even share and Result rows; **Payments**.
  - **Notes**, when there are notes.
- Before start (Q-PREPARE) is unchanged.

## Why
- Owner artifact comment, November 19, 2026, on the Settings tab's Setup: “this can be changed into readable layouts”,
  “some areas can be cards”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; with and without costs and notes.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Views table, Settings)
