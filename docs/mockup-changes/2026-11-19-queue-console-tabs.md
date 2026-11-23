# Queue app: the live console has six tabs: Courts, Main Queue, Generate Queue, Players, Leaderboard, Settings

Status: TICKETED — #1058
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › console (`viewConsole()`), `queuePane()`, `autoWorkspace()`
Route: /queue/sessions/s-tonight (`?tab=queue`, `generate`, `roster`, `board`, `settings`)
Screen ID: Q-CONSOLE, Q-QUEUE, Q-AUTO
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: tab row and phone tab menu (as on preparation), match queue, generate matches workspace, session setup card
Supersedes: none
Superseded by: none

## What changed
- **Tabs.** Before: Session, Queue (with a Main Queue | Generate matches switch inside), Players, Leaderboard.
  After, in this order: **Courts** (the old Session tab), **Main Queue**, **Generate Queue**, **Players**,
  **Leaderboard** (still hidden when Record games is off), **Settings**.
- **Main Queue and Generate Queue** are their own tabs. The switch above them is gone. The Main Queue's
  **Generate Queue** button (was **Generate matches**) opens the Generate Queue tab, and adding drafts returns
  to Main Queue. The heading reads **Main Queue** (was **Queued matches**) and **Generate Queue** (was **Generate matches**).
- **Settings** shows the session settings summary in place: the Setup card (courts with their times, formats,
  requests, mode, minimum, roster, costs, notes, and the Courts and time, Add player, Match requests and Payments
  buttons) and the session link card, then **All session settings**, which opens the read-only Q-PREPARE page.
  The ⋯ menu keeps **Session settings** too.
- **Chips:** Courts “X/Y courts in use”, Main Queue “N waiting” and the attention chip, Players “P/R present”,
  Leaderboard “NAME leads” or “N tied”. Generate Queue and Settings have none.
- **Phones:** the six tabs collapse into one menu button showing the current tab, like the preparation tabs.
- **Links:** each tab has its own `?tab=` value (`queue`, `generate`, `roster`, `board`, `settings`; none for Courts).

## Why
- Owner artifact comment, November 19, 2026, on the live console: “it should be Court (Sessions), Main Queue,
  Generate Queue, Players, Leaderboard, Settings”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: a recorded session (six tabs) and an unrecorded one (no Leaderboard); each tab selected; the phone menu
  open; Main Queue's Generate Queue button.

## Copy
- Tabs: “Courts”, “Main Queue”, “Generate Queue”, “Players”, “Leaderboard”, “Settings”.
- Headings: “Main Queue”, “Generate Queue”. Button: “Generate Queue”, “All session settings”.
- Phone menu label: “Console view”.

## Open
- The owner wrote “Court (Sessions)”; the mockup reads **Courts**. Confirm the label.
- Whether **Generate matches** is renamed **Generate Queue** everywhere (product terms, toasts, hints) or only on the
  tab and heading. The mockup changes the tab, the heading and the Main Queue button only.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Views table, Record games off line, Courts tab)
- docs/screens/product/modules/queue/match-queue.md (Q-AUTO opening line)
