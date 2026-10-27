# Matches and result integrity

**Status:** Confirmed v1 target rules. Updated October 26, 2026 to match the [ROTRA Queue prototype](../../../../../frames/queue-app/rotra-queue.html).

## Formats

| Format | Team sizes | Created by | Court requirement | Long-term performance |
|---|---|---|---|---|
| Singles | 1 v 1 | Manual, Make match, Suggest, Auto queue — only when Singles is on | One | Eligible |
| Doubles | 2 v 2 | Manual, Make match, Suggest, Auto queue — only when Doubles is on | One | Eligible |
| 1v2, 3v3, 4v4 | 1 v 2, 3 v 3, 4 v 4 | Operator only (Manual, Make match) | One | Excluded |
| 5v5 | 5 v 5 | Operator only (Manual, Make match) | Two courts, shown as one merged playing area | Excluded |

A session may mix singles and doubles. Players have one combined shared rank, not separate singles/doubles ratings.

Every match gets a **match number** in the order it was created in the session (Match 1, Match 2, …). Queue position is separate and changes as the queue moves.

Fun-game wins/losses count in session standings and may contribute to local MVP. Completing the whole fun game counts toward the minimum. Fun games never contribute to long-term player-performance rating or standard-match leaderboard eligibility.

## Start and completion

The operator always confirms Start match, choosing the free court (or two free courts for 5v5). No participant can be in two active matches at once. Eligibility is checked again at confirmation; if something changed, the start is refused with "Something changed. Review the match again."

An active match shows its court(s), format, start time, minutes played, teams, and any substitutions. Closing that view does not end the game; the court stays in use until a winner or an invalid decision is confirmed.

There are two ways to complete a valid game:

1. Enter both teams' final scores, which identify the winner.
2. Pick the winning team without entering scores.

Scores are optional supporting data, never a condition for ordinary game completion. A winner must be declared. No draw workflow was agreed.

Score rules:

- If either score is entered, both are required, as whole numbers 0 or more.
- The higher score wins. A tie cannot decide a winner; the operator corrects it or clears the scores and picks a winner.
- If a winner is also picked, it must agree with the score.
- There is no fixed target such as 21, and no set or deuce system.
- **Clear scores** removes both deliberately. Blank scores are stored as no score, never 0–0.

A review step shows the winner, the opponents, the score or "No score entered", and the court(s), then **Confirm Team A wins** (or B). After confirmation, the winner and any submitted scores are **permanent**. Neither the operator nor Admin can edit them. This follows the user's “touch move” rule.

Completion frees the occupied court(s). The permanent result can remain locally pending sync during offline operation.

## Substitutions

The operator may change lineups before a start (by editing the waiting match) or substitute players during a game.

A mid-game substitution picks the player coming off, then a replacement who is present, not in this match, and not playing elsewhere. The replacement joins the same team. A match can have more than one substitution, and each is recorded and shown on the match.

- A pre-start replacement who plays the whole match is a full participant.
- For a mid-game substitution, **both the outgoing player and incoming substitute** are excluded from that match's performance-based rank update.
- Neither receives minimum-game credit for the partial game.
- Only full-match participants can receive performance credit from that match.
- Both partial participants also get no win, loss, or game from that match in the live leaderboard, session standings, or awards. The match's other full participants count normally.

## Invalid match

If a game cannot be completed, the operator may mark it invalid after a confirmation dialog. That decision is also permanent.

An invalid match frees court(s), records no game played, no win, no loss, no performance, and no minimum-game credit. Retaining a non-counting operational event for sync is distinct from counting it as a player game.

See [completion flow](flow/complete-or-invalidate.md) and the [open decisions](../../../open-decisions.md).
