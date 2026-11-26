# Courts tab: pairs side by side on upcoming cards, faces on Next eligible

Status: TICKETED — #1118
Date: 2026-11-25
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › queueTile() compact (`.qt-vs`), free court card (`nePair()`, `.ne-line`)
Route: /queue/sessions/<live session> (Courts tab)
Screen ID: Q-CONSOLE (session-console.md: free court card, Upcoming queued matches)
Artifact: none
Components: match-card (compact), court card (free state)
Supersedes: the one-team-per-line compact layout of 2026-11-19-queue-upcoming-compact-cards.md
Superseded by: none

## What changed
- Upcoming queued matches (compact cards). Before: Team A's picture stack with "Danna, Darryn"
  beside it, VS, then Team B the same on the next line. After: the two teams side by side, each a
  picture stack above its names ("Danna & Darryn"), VS between. The card is shorter.
- Free court › Next eligible. Before: "Danna and Darryn vs Derr and DEXTER" as text. After: each
  pair's overlapping pictures (level ring, 26 px) then "Danna & Darryn", "vs" between; it wraps on a
  narrow card.

## Why
- Owner, November 25, 2026: "should be (faces) Danna & Darryn vs (faces) Derr & Dexter" and, "to
  save space", the upcoming card with faces above the names, the pairs side by side.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: doubles, 3v3 (three faces, long names truncate), singles, a card needing attention.
- Copy: names joined by " & ".
- Tokens: none.
- Known differences: none.

## Reuse plan
- Extends: the compact MatchCard (layout only) and the free court card's next-match line (reuse the
  same picture stack).

## Docs updated
- Business logic: none. Database design: none.
- Screen docs: docs/screens/product/modules/queue/session-console.md.

## Real app work
- Compact MatchCard side-by-side layout; picture stacks on the free court's Next eligible line.
