# Player app: Home for signed-in players

Status: TICKETED — #1081
Date: 2026-11-19
App: player
Mockup: apps/mockup/player-app/rotra-player.html › `viewHome`, `currentSessionCard`, `mySessionsCard` (now Upcoming sessions), `clubsPanel`, `topBar`, `signIn`, route `home`
Route: /player/home (new); /player/players/<me> (own profile)
Screen ID: P-HOME (new), P-OWN-PROFILE
Artifact: https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN
Components: home page, current session card, upcoming sessions card, clubs card, rank card, weekly performance card, top bar
Supersedes: none
Superseded by: none

## What changed
- Before: signing in opened the player's own profile. The leaderboard was everyone's home. My sessions and Your clubs
  were on the own profile.
- After:
  - **New Home page** at `/home`, for signed-in players only. Signing in lands there unless the player came from another
    page, and the ROTRA logo opens it.
  - **Layout:**
    - “Hi, NAME” at the top.
    - **Current session**: the live session, highlighted, with **Open session page**, or an empty state.
    - Then two columns:
      - left: **Upcoming sessions** (with Finished) and **Your clubs**;
      - right: **Your stats** (the shared rank card, then the year's weekly performance).
    - Phones show one column.
  - **Top bar:** unchanged, Leaderboard · Sign in for visitors and Leaderboard · My profile when signed in. The ROTRA
    logo is Home. A Home button was tried and removed the same day (owner artifact comment: “just remove home, clicking
    the logo is alraedy the home”).
  - **Own profile:** drops My sessions and Your clubs. Another player's profile keeps its Clubs card.

## Why
- Owner, November 19, 2026, in the session: “I think the home page for Rotra Players should be The current session,
  Upcoming sessions and access to clubs and current player stats”. Asked: Home is for signed-in players only, the top
  bar is Home · Leaderboard · My profile, and My sessions and Your clubs move off the profile.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: with a live session; no live session; no upcoming sessions; no clubs; offline; signed out (goes to sign in).

## Copy
- “Hi, NAME” · “Your sessions, clubs and stats.” · “Current session” · “Happening now” · “Open session page”
- “No session right now. When a session you're in starts, it shows here.”
- “Upcoming sessions” · “Your stats”
- “Saved copy. Your sessions, rank and games may have changed since this device was last online.”

## Open
- None.

## Docs updated
- screens/product/modules/player-information/README.md (navigation row, module table)
- screens/product/modules/player-information/profile.md (new P-HOME section; My sessions and Clubs card moved)
- screens/product/modules/player-information/ranking-history.md (Share result location)
- screens/product/navigation.md (`/home` protected)
- mvp/decisions/README.md (D-2026-11-19-10), mvp/workstreams/player.md
