# Queue session record: How the night ran matches as courts

Status: IN MOCK APP — PR #862
Date: 2026-11-15
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › historyMatch(s, m) (uses courtSVG, `.gm*` styles); caller histNightPane
Route: /queue/sessions/<id>/record (How the night ran)
Screen ID: Q-HISTORY
Artifact: none (owner reported it from the live app with a screenshot)
Components: match-court (Queue variant), record-court-columns
Supersedes: the match card (.hm) in the court columns: “#N” and time, Team A, score, Team B, the winning side tinted with “Won”
Superseded by: none

## What changed
- Before: each match in a court column was a small card: “#N” and the time range, Team A as 24 px faces, the score (or “no score” / Invalid), Team B, the winning team tinted with “✓ Won”.
- After: each match is the same small court as the finished session page's Match history (2026-11-13-queue-match-history-courts): Queue court art, “#N · start–end” (· Fun) as the corner pill, Team A on the left, faces with first names on dark pills, the winning pair ringed in the accent, a dark box on the net with the score (or “No score”) and “◀ Won” / “Won ▶”, Invalid on a desaturated court. The match on court at the replay moment glows. Substitution lines stay under the court. Faces open the player profile.
- Unchanged: the columns, their counts, play order, “No matches.”, the replay card.

## Why
- Owner, November 15, 2026, on the live session record: “please update these to use the court layout”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Team A won, Team B won, no score, invalid, Fun, highlighted by the replay, substitutions.
- Copy: “No score”, “◀ Won”, “Won ▶”, “Invalid”, the substitution lines.
- Tokens: --court, --court-line, --accent.
- Known differences: none.

## Reuse plan
- Reuses as is: match-court (Queue variant, with `now`), the existing substitution copy from match-record-card.
- New: nothing. match-record-card stays for the conflict review list.

## Docs
- Screen doc updated: docs/screens/product/modules/queue/results-sharing.md (Q-HISTORY › How the night ran).
- Business logic and database design: nothing became untrue.
