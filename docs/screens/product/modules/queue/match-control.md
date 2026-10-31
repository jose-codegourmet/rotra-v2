# Match start, substitutions, and permanent outcomes

**Surfaces:** `Q-DISPATCH`, `Q-CHOOSE-MATCH`, `Q-ACTIVE-MATCH`, `Q-SUBSTITUTE`, `Q-MATCH-DONE`, `Q-INVALID-MATCH`, `Q-MATCH-RECORD`.

**Source:** [match rules](../../../../business_logic/product/queue/modules/matches/README.md). Dialog language: [shared confirmations](../../dialogs.md). **Reference:** [ROTRA Queue prototype](../../../../../app/mocksups-app/queue-app/rotra-queue.html).

## Q-DISPATCH — Start a waiting match

**Entry:** **Review and start** on a free court, **Start** on a ready queue card, or **Start here** in Q-CHOOSE-MATCH.

Sheet “Start match N”: format chip (plus **Fun game**), Team A vs Team B as picture cards (names and levels; drag a player onto the other team to switch sides before starting, see [switch sides](match-queue.md)), and **Court** buttons for every free court — “Choose two free courts” for 5v5 with “5v5 uses two courts as one match.” The court that opened the sheet is preselected (plus a second free court for 5v5).

If the match is blocked, the reason appears and **Start match** is disabled. **Start match** is also disabled until the required number of courts is chosen.

At confirmation ROTRA rechecks players and courts. If anything changed: toast “Something changed. Review the match again.” and the sheet stays open. Success: “Match N started on Court X”. Repeated taps cannot start twice.

Offline start uses downloaded state and durable local recording. Disconnected devices cannot guarantee global exclusivity; later conflicts are reconciled.

## Q-CHOOSE-MATCH — Pick another match for a court

Sheet “Start a match on Court X”. Copy: “Any ready match can go next. Queue order is a suggestion, not a rule. A match only stays locked while one of its players is still on court or isn't present.”

One row per waiting match: “#P”, teams, “FORMAT · Ready to start” or the block reason, and **Start here** (enabled only when ready), which opens Q-DISPATCH for that court.

## Q-ACTIVE-MATCH — In-game control

Sheet “Match N · Court X”: “FORMAT · started HH:MM · M min in”, both teams with levels, one line per substitution (“Kiko replaced Jom. Neither gets credit for this game.”), and “The court stays in use until you confirm a winner or mark the match invalid. Closing this doesn't end the game.”

Actions: **Mark invalid** (destructive style), **Substitute player**, **Match done** (primary). No edit-level, change-past-result, or reset shortcut. No point-by-point scoring and no umpire product.

## Q-SUBSTITUTE — Mid-game replacement

Sheet “Substitute in match N”:

1. **Who's coming off?** — tiles for everyone in the match, each noting Team A or B.
2. **Replacement** — tiles for present players who are not in this match and not playing elsewhere; “No present player is free right now.” when none.

**Review substitution** opens **Confirm substitution**: Out, In (with level), Team, and the warning “Neither player's partial game will count toward their minimum or long-term performance.” Actions **Back** and **Confirm substitution**. Success returns to Q-ACTIVE-MATCH with “Kiko in for Jom”.

The outgoing player stays on the match record. A swap before Start match uses Q-MANUAL and is not a substitution.

## Q-MATCH-DONE — Two completion paths

Sheet “Match N result”:

1. **Pick the winner** — two choice cards, Team A and Team B, with names.
2. **OR — Enter the final score** — Team A and Team B number fields labeled with their players.

Hint: “Scores are optional. If you enter them, the higher score wins.” **Clear scores** appears once a score is typed.

**Review result** validates:

| Problem | Message |
|---|---|
| Nothing chosen | “Pick a winner or enter the final score.” |
| Only one score, or not a whole number ≥ 0 | “Enter both scores as whole numbers, or clear them.” |
| Tied score | “A tie can't decide a winner. Correct the score, or clear it and pick a winner.” |
| Score disagrees with the picked team | “The score says Team B won, but Team A is picked. Fix one of them.” |

The review step **Confirm match result** shows Winner “Team A: names”, “Against Team B: names”, the score “21–17 (Team A–Team B)” or “No score entered”, the court(s), and the warning “This result cannot be changed after confirmation. The court will become available.” (“Both courts” for 5v5). Actions **Back to result** and **Confirm Team A wins**.

After confirmation:

- Save durably before freeing the court(s).
- Lock winner and provided scores permanently, including against Admin edits.
- No Undo, Change winner, Add score later, or Reopen.
- Toast: “Team A wins match N · Court X free”. Leaderboard and game counts update.
- Offline: the toast adds “Saved on this device, waiting to sync”.

Submission timeout: first establish whether the confirmation was saved; retry the same operation, never a competing outcome.

## Q-INVALID-MATCH — End without a counted game

Dialog **Mark match invalid?**: “Match N on Court X”, both teams, and “No game, win, loss, or minimum-game credit will be recorded. This decision cannot be changed.” Actions **Keep playing** (back to the match) and **Confirm invalid match** (destructive). No reason field.

Success frees all occupied courts: “Match N marked invalid · Court X free”.

## Q-MATCH-RECORD — Read-only outcome

In the [session record](results-sharing.md#q-history--session-record), each match shows “#N”, its time range, a Fun chip when relevant, both teams with the winning side highlighted “✓ Won”, the score or “no score” (or an **Invalid** chip), and “S substitutions; partial games not counted”.

## Acceptance examples

- Winner-only confirmation succeeds with no score values.
- Closing the score sheet before confirming does not release the court.
- A failed local write cannot display Match done or free the court.
- Invalidating a 5v5 game frees both courts and adds zero games to everyone.
- Once confirmed, even the Admin product offers no result correction.
- A ready match at #4 can start while #1 is blocked.
