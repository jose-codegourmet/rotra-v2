# Matches and result integrity

**Status:** Confirmed v1 target rules. Updated October 26, 2026 to match the [ROTRA Queue prototype](../../../../../../apps/mockup/queue-app/rotra-queue.html). Updated November 6, 2026 for the owner's On court step and substitution game credit ([log](../../../../../mockup-changes/2026-11-06-queue-on-court-and-sub-credit.md)).

## Formats

| Format | Team sizes | Created by | Court requirement | Long-term performance |
|---|---|---|---|---|
| Singles | 1 v 1 | Manual, Make match, Suggest, Generate matches — only when Singles is on | One | Eligible |
| Doubles | 2 v 2 | Manual, Make match, Suggest, Generate matches — only when Doubles is on | One | Eligible |
| 1v2, 3v3, 4v4 | 1 v 2, 3 v 3, 4 v 4 | Operator only (Manual, Make match) | One | Excluded |
| 5v5 | 5 v 5 | Operator only (Manual, Make match) | Two courts, shown as one merged playing area | Excluded |

A session may mix singles and doubles. Players have one combined shared rank, not separate singles/doubles ratings.

Every match gets a **match number** in the order it was created in the session (Match 1, Match 2, …). Queue position is separate and changes as the queue moves.

Fun-game wins/losses count in session standings and may contribute to local MVP. Completing the whole fun game counts toward the minimum. Fun games never contribute to long-term player-performance rating or standard-match leaderboard eligibility.

## Lifecycle

A match moves through these steps (owner decision, November 6, 2026):

| Step | Meaning | Switch sides / partners | Replace a player | Court card |
|---|---|---|---|---|
| Waiting | In the queue, no court | Yes (edit lineup) | Yes (edit lineup) | — |
| On court | Placed on a court, not started yet | Yes | Yes: a plain lineup change (see [Substitutions](#substitutions)) | **Getting ready** |
| Playing | Started with **Start match** | No | **Replace player** to fix a mistake (no substitution recorded), or **Substitute** with the game-credit choice | **Playing** |
| Done / Invalid | Permanent outcome | No | No | — |

The buttons stay **Start match** and **Match done**.

## Start and completion

Getting a match going takes two operator steps:

1. **Put on court.** The operator places a waiting match on a free court (two free courts for 5v5). The court is chosen here. The match is now **On court**. With [Auto Queue](../queueing/README.md#auto-queue-and-manual-queue-court-filling) on, ROTRA places the next ready match itself, but never starts it.
2. **Start match.** One tap on the On court match, because the court is already chosen. ROTRA rechecks presence and busy players first; if something changed, the start is refused with "Something changed. Review the match again." Success: "Match N started on Court X". The minutes-played timer starts here, not at placement.

No participant can be in two On court or Playing matches at once. Players in an On court match count as **busy**: they cannot be put on another court or start elsewhere, and the reason names the court ("Migs is on Court 1").

While a match is On court the operator can:

- switch sides or partners, and replace a player (a lineup change);
- **Send back to queue:** the match goes to the **top** of the queue and the court frees. A match that was edited while On court goes back as a protected manual match;
- **Move to another court:** needs a free open court (two for 5v5).
- **Swap with the queue:** the next waiting match that is ready for this court (first in queue order, same number of courts, counting this match's players as free) goes on the court as Getting ready, and this match takes **that match's place** in the queue (not the top). Example: Match 1 on Court 1, queue Match 3, Match 4 → after the swap Match 3 is on Court 1 and the queue is Match 1, Match 4. Disabled when no other waiting match is ready. Like Send back, a match edited while On court goes back protected. The court never frees, so Auto Queue does nothing.

If a player in an On court match is marked not present, the court shows the reason and Start match is disabled until the lineup is fixed (Replace player) or the match is sent back.

A Playing match shows its court(s), format, start time, minutes played, teams, and any substitutions. Closing that view does not end the game; the court stays in use until a winner or an invalid decision is confirmed.

Removing a court is blocked while any match (On court or Playing) is on it. Since November 11, 2026 a court's end time and label can still change while a match is on it (the match is not touched; the planned start stays fixed once used; [Sessions › Running](../sessions/README.md#running)).

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

Completion frees the occupied court(s). The permanent result can remain locally pending sync during offline operation. After every confirmed result, in both Manual Queue and Auto Queue, the operator is offered the next match for the freed court (a pick of up to the first five ready waiting matches, or Skip for now); see [the next-match picker](../queueing/README.md#auto-queue-and-manual-queue-court-filling).

## Substitutions

The operator may change lineups before a start (by editing the waiting match, or by replacing a player while the match is On court) or substitute players during a game.

**Before Start match.** Replacing a player in a Waiting or On court match is a plain lineup change. The replacement is a full participant if they play the whole match. It is not recorded as a substitution and never asks who gets the game.

**Replace during play: fixing a mistake (owner, November 13, 2026; [log](../../../../../mockup-changes/2026-11-13-queue-replace-during-play.md)).** A Playing match also has **Replace player**, for when the Queue Master put the wrong player in. It is a correction, not a substitution: the replacement is recorded as having played the whole game, the player taken out gets nothing from it, and nothing is recorded as a substitution or asks who gets the game. Same candidates as a substitution (present, not in this match, not busy). The rule the owner gave: **replace** is when the QM makes a mistake; **substitute** is when a player really needs a sub.

**During play.** A substitution in a Playing match picks the player coming off, then a replacement who is present, not in this match, and not busy elsewhere. The replacement joins the same team. A match can have more than one substitution, and each is recorded and shown on the match.

**Who gets this game? (owner decision, November 6, 2026).** At confirmation the operator chooses one of:

| Choice | Effect |
|---|---|
| **Nobody** (default, the usual case) | Neither partial player gets anything from this match |
| **The incoming player** (coming in) | The incoming player counts as a full participant of this match **for the session** |
| **The outgoing player** (going off) | The outgoing player counts as a full participant of this match **for the session** |

- Never both. Choosing a person for a team slot replaces any earlier credit choice for that same slot, so at most one person per slot gets the game.
- The sheet shows "Started M min ago" to help decide. There is no automatic minute threshold; giving the game is the operator's courtesy.
- What the credited player gets: the **game count, minimum-game credit, and the win or loss** in the live leaderboard, session standings and session awards.
- What the credited player never gets: **long-term performance or rank** from that match. Both partial players stay excluded from the performance-based rank update.
- The uncredited partial player gets nothing: no game, win, loss, or minimum-game credit from that match in the live leaderboard, session standings, or awards.
- The choice is made at substitution confirmation and **locks** when the match is done or invalid. An invalid match still gives nobody anything.
- The match's other full participants count normally. Only full-match participants can receive long-term performance credit from that match.

The match record shows the choice, for example "Kiko replaced Jom · Kiko got the game (QM choice)".

## Invalid match

If a game cannot be completed, the operator may mark it invalid after a confirmation dialog. That decision is also permanent.

An invalid match frees court(s), records no game played, no win, no loss, no performance, and no minimum-game credit. Retaining a non-counting operational event for sync is distinct from counting it as a player game.

See [completion flow](flow/complete-or-invalidate.md) and the [open decisions](../../../open-decisions.md).

## Match request, player side ([D-2026-11-09-05](../../../../../mvp/decisions.md#d-2026-11-09-05))

- A present, signed-in, confirmed Player sends **Request a match** from the session page: the format from six pills (2 v 2 default, 1 v 1, 1 v 2, 3 v 3, 4 v 4, 5 v 5), each enabled only when the session's **Players can request** setting allows it (owner request, November 9, 2026; defaults decided by the owner on November 10, 2026, option A: a new session allows 2 v 2, 1 v 1 when Singles is on, and no fun format until the QM turns it on; a session saved without a selection behaves the same until edited; real mode does not save the selection yet, with no Prisma column), and partners and opponents picked from present players, as many spots as the format needs (2 v 2: 1 partner and 2 opponents; 1 v 1: 1 opponent; 1 v 2: 2 opponents; 3 v 3 to 5 v 5: N−1 partners and N opponents), any spot left as “Anyone”. With no format allowed, the request can't be sent. Presence shows only inside that picker, and only to signed-in confirmed players; the picker also tells who is on a court (Playing) and who is not (Available), and can filter by skill group and sort by waiting time or games played (owner request, November 9, 2026). Players on a court or in a waiting match can still be picked.
- After sending, the page shows “Match request sent · the QM decides” with **Cancel**. One open match request per player. The players named are not asked and not told; only the QM sees requests.
- A **Match request** is distinct from a Join request. A request closes by itself when anyone named stops being present, or when the session ends; the record keeps it, hidden.

## Match request, QM side ([D-2026-11-09-05](../../../../../mvp/decisions.md#d-2026-11-09-05))

- Open match requests show under **Requests · N › Match**, oldest first: “NAME asks for a doubles match”, then one line per spot (requester, partners, opponents, as many as the format needs) with that player's games against the minimum, their level, and “On Court 2” or “In queue #3” where it applies; an unnamed spot reads “Anyone”.
- **Add to queue** makes it a waiting match at the end of the Main Queue, protected from regeneration like a manual match: the requester and partners on one side, the opponents on the other, each “Anyone” spot filled from present players not already named, fewest games (played plus queued) first. If not enough present players remain, nothing is added and the QM is told. The request becomes `added` and points at the match. **Decline** closes it as `declined`. Nothing tells the other players; the QM judges fairness, the server doesn't block requests.
- Auto-close: the request closes (`closed`, hidden) when anyone named stops being present (the QM's Present switch, Mark all absent, removal, or the player's **I'm leaving**) or when the session finishes.
