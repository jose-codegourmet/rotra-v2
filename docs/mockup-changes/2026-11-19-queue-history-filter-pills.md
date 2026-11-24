# Queue app: Match History's court filter is a row of pills with count badges

Status: IN MOCK APP — #1052
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `liveHistoryPane()` (`.cfilter`)
Route: /queue/sessions/s-tonight?tab=history
Screen ID: Q-CONSOLE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: filter pill with count badge (new)
Supersedes: none
Superseded by: none

## What changed
- Before: one segmented control with “All courts · 15 | Court 1 · 5 | …”.
- After: separate rounded pills, **All courts** then one per court, each with its count in a small round badge on the
  right. The picked pill is solid accent (its badge a lighter tint); the others are outlined and brighten on hover.
  They wrap onto a second line on phones.

## Why
- Owner artifact comment, November 19, 2026, on Match History's court filter: “the tabs with counts here look bad, update
  the design”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; All courts picked and one court picked; a court with 0.

## Open
- Whether the other filters with counts (the Players tab's Show filter) should use the same pills.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Views table, Match History)
