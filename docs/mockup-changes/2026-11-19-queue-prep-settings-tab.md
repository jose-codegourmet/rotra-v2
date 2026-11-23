# Queue app: preparation gets a Settings tab; the Edit preparation button is gone

Status: TICKETED — #1074
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `viewPrepare()`, `prepSettings(s)`, `ACT.editSetup`
Route: /queue/sessions/x-next-full/prepare (`?tab=settings`)
Screen ID: Q-PREPARE, Q-SETUP
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: preparation tab row and phone tab menu, settings cards (same style as the live console's Settings)
Supersedes: none
Superseded by: none

## What changed
- Before: the preparation header had an **Edit preparation** button (short label **Edit** on phones) that opened the
  session editor at step 1.
- After: that button is gone. A **Settings** tab sits after **Payments** (before start only). It shows the setup as
  cards: Date and venue, Courts, Game rules, Costs (when set) and Notes. Each card's **Edit** opens the editor at its
  step (1, 1, 2, 3, 3). Back from the editor returns to the Settings tab.
- During play nothing changes: there is no Settings tab on this page and Overview keeps the read-only summary.

## Why
- Owner artifact comment, November 19, 2026, on Club Doubles Night (before start): “remove edit preparation and it
  should be inside Settings … Settings is part of the tabs right next to payments”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: a prepared session with and without costs and notes; each Edit button; Back from the editor; the phone tab menu.

## Copy
- Tab: “Settings”. Heading “Settings”. Helper: “Everything set when the session was made. Edit opens that part of the
  session editor; saving needs an internet connection.”
- Cards: “Date and venue”, “Courts”, “Game rules”, “Costs”, “Notes”. Button: “Edit”.
- Empty notes: “No notes. Notes show on the public session page.”

## Open
- The Overview tab still shows the Setup summary card before start. Keep it, or leave Overview to This device and the
  session link now that Settings has the setup?

## Docs updated
- docs/screens/product/modules/queue/session-setup.md (Entry, Q-PREPARE header actions, Settings tab)
