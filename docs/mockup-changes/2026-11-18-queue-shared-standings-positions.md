# Queue app: players with the same wins and losses share a standings position, with their faces stacked

Status: IN MOCK APP — #961
Date: 2026-11-18
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › console › Leaderboard, session record › Results › Standings, finished session page › Leaderboard, the Standings slide, Share leaderboard images; helpers `standings()`, `standGroups()`, `groupGames()`
Route: /queue/sessions/s-tonight?view=leaderboard; /queue/history (a finished session record, Results); the finished public session page › Leaderboard
Screen ID: Q-LEADERBOARD, Q-HISTORY, Q-STANDINGS-SLIDE, Q-PUBLIC-RESULTS
Artifact: none
Components: live-leaderboard, session-standings, leaderboard-share-card, avatar
Supersedes: none
Superseded by: none

## What changed
- **Order.** Before: most wins, fewest losses, head-to-head, then name, every player on their own position. After:
  most wins, then fewest losses. Players with the same wins and losses **share one position** and the next
  position skips the shared places (1, 1, 3). The name only orders the players inside a shared position.
- **Standings tables** (console Leaderboard, record Standings, finished session page Leaderboard): one row per
  position. A shared position shows its players' faces stacked and overlapping, the first on top, with every
  name on the lines under the faces, separated by commas. Each face still opens that player's profile.
- **W and L** are the shared values. **Games** shows one number, or a range (`5–6`) when counted games differ
  inside the position (a games adjustment adds no result). **Win %** on the console is wins over wins plus losses.
- **Level line** on the console row lists the distinct levels in the position.
- **Top three tint and rank badge** follow the position number, so a position 3 shared by three players is tinted.
- **Finished session page:** the row holding the viewer is tinted and their name reads "NAME (you)". **Your
  position** shows the shared number and "of N · tied with 2 others".
- **Console tab chip:** "NAME leads", or "3 tied" when the top position is shared.
- **Standings slide and Share leaderboard images:** still one row per player; the number is the shared position.
- **Session record › Players:** the "#N" chip is the shared position.

## Why
- Owner, November 18, 2026: "players within the same standing should be in the same position stacking their
  avatars like this (  )   )   )".
- Owner answers, November 18, 2026: players share a position on the **same wins and losses**; numbering is
  **1, 1, 3**.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: a position with one player (unchanged row); two, three and six players sharing; the viewer inside a
  shared position; games that differ inside a position; no counted games (unchanged empty state).
- Copy: "most wins, then fewest losses. Players with the same wins and losses share a position." (console);
  "Wins first, then fewer losses. Players with the same wins and losses share a position. Counted games only."
  (finished session page); "tied with 1 other" / "tied with N others"; "N tied" (console tab chip).
- Tokens: none
- Known differences: none

## Reuse plan
- Extends: live-leaderboard — rows grouped by position, a stacked-faces cell, a games range
- Extends: session-standings — the same grouping, the viewer inside a group, "tied with N others"
- Extends: leaderboard-share-card — the position number per row comes from the standings, not the row index
- Extends: avatar — or a small new avatar-stack if no existing component overlaps faces
- Shares work with: none

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/results/README.md — the standings order and shared
  positions; docs/business_logic/product/open-decisions.md — the tie question is decided
- Database design: docs/database_design/product/queue/modules/results-publication.md — how standings are computed
- Screen docs: docs/screens/product/modules/queue/results-sharing.md, session-console.md, and
  docs/screens/product/open-decisions.md
- Decision: D-2026-11-18-05

## Real app work
- `computeStandings` in `@rotra/data/match/match.rules` (and the server copy that reads it): drop head-to-head,
  give each row its position. This is ranking math: confirm the open points in D-2026-11-18-05 first.
- `LiveLeaderboard`, `SessionStandings`, `LeaderboardShareCard` and their containers in `apps/queue`.
