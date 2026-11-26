# Player app: four style options for the dock's session button

Status: IN REAL MODE — #1149
Date: 2026-11-26
App: player
Mockup: apps/mockup/player-app/rotra-player.html › `navSession` (`when`), `navItems` (`.ses-when`), `.dock[data-ses=…]` styles, Prototype › "Session button style"
Route: every Player page (phones)
Screen ID: all P- screens (mobile dock)
Artifact: https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN
Components: mobile dock
Supersedes: none
Superseded by: 2026-11-27-player-desktop-session-pill.md (desktop top-bar style only)

## What changed
- Owner asked for options. Prototype › Session button style switches the dock's Back to session / Incoming session
  button between:
  - **Current**: the green filled button (v36).
  - **1 Raised**: a round 76 px button lifted out of the dock with a glow; while live, a ring ripples out from it.
  - **2 Glow ring**: a dark button with a spinning green border, and a red **LIVE** tag while live.
  - **3 Arcade**: the Top Three pixel type (Silkscreen), a pressed-key shadow, moving scanlines and a blinking cursor
    while live.
  - **4 With time**: the label plus when: "Now · until 9:00 PM" while live, "Today · 8:00 PM" or "Sun · 7:00 PM" for an
    incoming one.
  - **5 Pixel** (owner, same day, with a pixel-art START button as reference: "how about something like this but apply
    rotra branding"): an ink outline with stepped corners, a light top band, a darker bottom lip and a green drop under
    it, two diagonal gloss streaks, Silkscreen type (owner, same day: "maybe remove the icon I want the word to be obvious", so the word stands alone at 20 px; the 12 × 12 pixel shuttlecock is dropped). Pressing pushes the face down;
    while live a shine sweeps across in pixel steps. Brand-sprite tokens `--px-*`, the same in both themes. Built in
    CSS and inline SVG, not a Higgsfield image or a Rive file, so the label, live state and themes stay live.
- Reduced motion turns every animation off.

## Why
- Owner artifact comment, November 26, 2026, on the session button: "can we put some jazz in to this, give me options".

## Like for like
- Once picked: 375 px, dark and light; current, incoming today, incoming later.

## Picked
- Owner, November 26, 2026: "please go with the ready and start button". The pixel START-style button (option 5) is
  the session button on the phone dock, reading PLAY while live and READY when the session is today. Options 1–4 and the
  Prototype "Session button style" switch are removed. Owner, same day: "hey do the pixel design": the wide-screen top bar
  uses the same pixel button (14 px type) in place of the green pill.
