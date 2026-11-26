# Queue app: live session header trimmed; Payments becomes a console tab

Status: IN REAL MODE — #1137, #1138, #1139, #1140
Date: 2026-11-26
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `viewConsole` (header `.live-acts`)
Route: /sessions/[id] (live)
Screen ID: Q-CONSOLE (header)
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: live session header actions
Supersedes: the header button from 2026-11-11-queue-match-requests-live-only.md
Superseded by: none

## What changed
- Before: the header cluster was Match requests · N, Courts and time, Payments, ⋯.
- After: Match requests, **Share** (the ⋯ menu is gone; owner, same day: "remove this and make this into a share button,
  opens a dialog, shows the list, shows the social post images, shows the invite link"). Share opens one dialog with the
  Player list (Facebook post text, Copy list), the Social post images (Session QR card, Post / Story, Download image) and
  the Invite link (Copy link). Back to preparation… moved to the Settings tab's Setup head; Public page is the title link.
- Before that change, the header was: Match requests, ⋯. Match requests is a raised-hand icon with the count as a badge on wide screens, and a
  full-width button with its words on phones (owner, same day: "put match request icon here, make it as a button in
  mobile"). The ⋯ menu no longer has **Home** (owner, same day: "remove home"); instead a **← Home** back
  button sits at the top, above the header (owner: "put the back to home here at the top").
- Payments is a console tab, between Match History and Settings, showing the same payments panel as the old sheet
  (owner, same day, on the tabs: "put payments here in the tabs"). The Settings tab's Costs card **Payments** button now
  opens that tab. The Courts and time sheet still opens from **Set end time** on the overdue
  banner; the Settings tab's Courts card keeps Extend, Add court and each court's start and end.

- On phones the console's view picker (a dropdown) is a button that opens a left drawer listing the views with their
  chips (owner, same day: "make this into a sidebar menu, clicking on it opens a sidebar on the left").

## Why
- Owner artifact comments, November 26, 2026, on the header's Courts and time button: "remove this"; on its Payments
  button: "remove payments here".

## Like for like
- Compare at: 375 px and 1280 px, dark and light. States: requests waiting, none, offline, overdue.

## Docs updated
- screens/product/modules/queue/session-console.md (header actions; the sheet's openers).
