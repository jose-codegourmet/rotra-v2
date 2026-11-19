# Player app: bottom dock for the main navigation on phones

Status: NEW
Date: 2026-11-19
App: player
Mockup: apps/mockup/player-app/rotra-player.html › `topBar` (`.dock`), `NI.user`, `.dock` styles
Route: every Player page
Screen ID: all P- screens (top bar)
Artifact: https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN
Components: top bar, mobile dock (new)
Supersedes: none
Superseded by: none

## What changed
- Before: on phones the top bar wrapped, with the Leaderboard and My profile / Sign in buttons on a second row.
- After, on phones (640 px and narrower):
  - Those buttons move to a fixed **bottom dock**: **Leaderboard** with a trophy icon, and **My profile** (or
    **Sign in**) with a person icon, label under each icon. The current page is in the accent.
  - The dock respects the safe area, and the page gets bottom padding so nothing hides under it.
  - The top bar keeps the ROTRA logo (Home when signed in), the notifications bell and the light/dark switch on the
    right.
- Wider screens are unchanged.

## Why
- Owner artifact comment, November 19, 2026, on the top bar: “can we make the mobile version of the header be a dock on
  mobile but keep the notifications and light/dark mode button on the top right”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: visitor (Leaderboard, Sign in), signed in (Leaderboard, My profile), each page current, a dialog open, a
  toast.

## Copy
- “Leaderboard” · “My profile” · “Sign in”.

## Open
- Whether the dock should also carry Home (the logo is Home today).

## Docs updated
- screens/product/modules/player-information/README.md (navigation row).
