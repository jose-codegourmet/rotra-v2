# Player app: Settings page and a session slot in the main navigation

Status: NEW
Date: 2026-11-26
App: player
Mockup: apps/mockup/player-app/rotra-player.html › `navSession`, `navItems`, `topBar`, `viewSettings`, `mySessions`, `NI.gear`, `.dock a.nav-ses`, `.set-list` styles, Prototype › "Migs's sessions"
Route: every Player page; new `/player/settings` (P-SETTINGS)
Screen ID: all P- screens (top bar and dock), P-SETTINGS (new)
Artifact: https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN
Components: top bar, mobile dock, settings list (new)
Supersedes: none (builds on 2026-11-19-player-mobile-dock.md)
Superseded by: none

## What changed
- Signed in, the main navigation (top bar on wide screens, bottom dock on phones) is now
  **Leaderboard · session slot · My profile · Settings**. Visitors keep **Leaderboard · Sign in**.
- The session slot shows only when the player has a game:
  - **Play** (drafted as "Back to session", then "Live now") while a session they're in is happening now (icon pulses; reduced motion turns it off).
  - **Ready** when the next session they're in is today; **Next up** (drafted as "Incoming session") when it is a
    later day. Owner, same day: "maybe just PLAY and if about to start say READY". Owner, same day:
    "back to session is too long, keep the words small one word or 2".
  - It opens that session's page (`/queue/s/<slug>`), like the Home cards. On the dock it is the highlighted
    (accent-filled) middle item, matching the Queue dock's highlighted middle button.
- New **Settings** page (P-SETTINGS, `/player/settings`, signed in only). It only gathers what already exists:
  Account (Edit profile, Privacy and contact, Verification), This device (Dark mode switch) and Sign out. No new
  setting.
- Settings leaves the nav while a session is happening now, or when the incoming session is today, so the dock is
  Leaderboard · session · My profile (owner artifact comment, November 26, 2026: "remove settings if there is an active
  session and if the upcoming session is within the day"). Settings stays reachable from the Your account card on My
  profile, which gained a **Settings** button.
- Prototype panel: "Your sessions" switch: Current session · Incoming today · Incoming in a few days · No session. It drives the dock and
  Home's Current session and upcoming cards for whoever is signed in, including an account registered in the prototype.

## Why
- Owner artifact comment, November 26, 2026, on the dock: "there should be settings and if there is a game it should
  be leaderboard ( back to session / incoming session ) profile".
- Owner, November 26, 2026: "add a prototype for players to have a incoming session and current session".

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: visitor; signed in with a current session, an incoming session, no session; Settings current.

## Copy
- "Play" · "Ready" · "Next up" · "Settings" · "Your account, privacy and how ROTRA looks on this device."

## Open
- Whether "Incoming session" should only show within a time window (today, or the next 24 hours) instead of for the
  soonest session at any distance. The mockup shows it for the soonest one.

## Docs updated
- screens/product/modules/player-information/README.md (navigation row).
