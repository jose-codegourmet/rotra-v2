# Umpire App — 03 Scoring Interface

## Overview

The scoring interface is a single-screen, mobile-optimized view. It is designed for one-handed use during a live match — large buttons, minimal chrome, and no navigation away from the current match.

---

## Layout

```
┌─────────────────────────────────────┐
│  COURT 1  •  SET 1  •  ● LIVE       │  ← Court label, current set, live indicator
├───────────────────┬─────────────────┤
│    TEAM A         │    TEAM B       │
│  [Player names]   │  [Player names] │  ← Names (+ photos if logged in)
│                   │                 │
│        18         │       15        │  ← Live score (very large, high contrast)
│                   │                 │
│   [ + POINT ]     │  [ + POINT ]    │  ← Primary action buttons (largest on screen)
├───────────────────┴─────────────────┤
│       [ ↩  UNDO LAST POINT ]        │  ← Undo (smaller; requires deliberate tap)
│       [ ●  SET TRACKER: 1 – 0 ]     │  ← Current set score
│       [ ✓  SUBMIT FINAL SCORE ]     │  ← Submit (visible but not prominent until ready)
└─────────────────────────────────────┘
```

---

## Interface Elements

### Court Label
- Shows court name (e.g. "Court 1", "Main Court") as configured in the session
- Shows the current set number (e.g. "SET 1", "SET 2")
- A pulsing dot indicator shows the connection is live

### Team Sections
- Each team occupies half the screen
- Player names are shown below the team label
- If the umpire is authenticated and the players have profile photos, photos are shown next to names
- Guest umpires see text names only

### Score Display
- Large, high-contrast point count per team per set
- Font size chosen so the score is readable from 2–3 meters away
- Score updates instantly when a `+ POINT` button is tapped

### `+ POINT` Buttons
- The largest interactive targets on the screen
- Each is color-coded per team (left team / right team)
- Tapping adds 1 point to the corresponding team's score for the current set
- A brief haptic feedback and visual flash confirm the tap

### Undo
- Removes the most recently awarded point (regardless of which team)
- Only **1 level of undo** — cannot step back multiple points
- After an undo, the previous state is restored on both the local view and the server broadcast
- Undo is disabled after the final score has been submitted

### Set Tracker
- Displays the current set score (e.g. "1 – 0")
- Advances automatically when a set is won (score reaches the win condition)
- A set win triggers a brief set-end animation and resets both point counters to 0

### Submit Final Score
- Always visible, but styled subdued to avoid accidental taps during active play
- Becomes more visually prominent after both teams have played at least one set
- Tapping opens a confirmation dialog (see [`04_score_submission.md`](./04_score_submission.md))

---

## Set Logic

### Set Win Condition

The win condition (score limit) is set by the Que Master during session setup (e.g. 21 points). The umpire does not configure this — the limit is displayed at the top of the screen for reference.

```
Win condition: 21 points
Team A reaches 21 → Set win for Team A
    → Brief animation: "TEAM A WINS SET 1"
    → Set score advances: 1–0
    → Both point counters reset to 0
    → Next set begins
```

### Deuce Handling (if applicable)

If the session is configured with a deuce rule (e.g. deuce at 20–20, win by 2):
- When both teams reach the deuce threshold, the interface shows "DEUCE"
- The win condition dynamically becomes "lead by 2"
- The set ends when one team leads by 2 consecutive points

### Match Format

The Que Master's format choice (Best of 1 / Best of 3) determines how many sets are played. The Umpire App handles set transitions automatically — the umpire never needs to manually advance the set.

---

## Visual States

| State | What the Umpire Sees |
|-------|---------------------|
| Match not yet started | "Waiting for match to begin…" — buttons disabled |
| Match in progress | Full scoring interface active |
| Set just won | Brief set-end overlay, then auto-reset for next set |
| Final set / match point | "Match point" indicator near the leading team's score |
| Disconnected | Offline banner at top; points queued locally |
| Match already submitted | "This match has been scored" — read-only view of the final score |
| Token revoked | "Umpire access has been revoked by the Que Master" — session ends |

---

## Accessibility Considerations

- All interactive elements meet minimum touch target size (44×44pt)
- Color is never the sole differentiator between teams — team labels also use position (left/right) and text
- High contrast mode is supported on both iOS and Android
- No time-sensitive animations that would confuse or block action
