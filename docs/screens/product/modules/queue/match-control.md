# Match start, substitutions, and permanent outcomes

**Surfaces:** `Q-DISPATCH`, `Q-CHOOSE-MATCH`, `Q-ON-COURT`, `Q-ACTIVE-MATCH`, `Q-SUBSTITUTE`, `Q-MATCH-DONE`, `Q-NEXT-MATCH`, `Q-INVALID-MATCH`, `Q-MATCH-RECORD`.

**Source:** [match rules](../../../../business_logic/product/queue/modules/matches/README.md). Dialog language: [shared confirmations](../../dialogs.md). **Reference:** [ROTRA Queue prototype](../../../../../apps/mockup/queue-app/rotra-queue.html).

**Owner decision, November 6, 2026** ([log](../../../../mockup-changes/2026-11-06-queue-on-court-and-sub-credit.md)): getting a match going is two steps. **Put on court** places it (status **On court**, court chip **Getting ready**); **Start match** starts it (status **Playing**). Neither the Manual Queue nor the Auto Queue mode ever starts a match.

## Q-DISPATCH — Put a waiting match on court

**Entry (Manual Queue, or by hand in Auto Queue):** **Put on court** on a free court, **Put on court** on a ready queue card, or the row action in Q-CHOOSE-MATCH. In Auto Queue, ROTRA places the next eligible match itself, without this sheet, on every free court except the one a result just freed: that court goes through [Q-NEXT-MATCH](#q-next-match--next-match-picker-after-a-result) first, and Auto Queue fills it only if the operator skips; 5v5 matches and courts not open yet are always placed by hand here. A court whose booking ended still gets filled; the end is a reminder.

Sheet “Put match N on court”: format chip (plus **Fun game**), Team A vs Team B as picture cards (names and levels; drag a player onto the other team to switch sides, see [switch sides](match-queue.md)), and **Court** buttons for every free court — “Choose two free courts” for 5v5 with “5v5 uses two courts as one match.” The court that opened the sheet is preselected (plus a second free court for 5v5).

If the match is blocked, the reason appears and **Put on court** is disabled. **Put on court** is also disabled until the required number of courts is chosen.

At confirmation ROTRA rechecks players and courts. If anything changed: toast “Something changed. Review the match again.” and the sheet stays open. Success closes the sheet; the court now shows the match as **Getting ready** ([Q-ON-COURT](#q-on-court--getting-ready)). Repeated taps cannot place twice. Placing does not start the timer.

Offline placement uses downloaded state and durable local recording. Disconnected devices cannot guarantee global exclusivity; later conflicts are reconciled.

## Q-CHOOSE-MATCH — Pick another match for a court

Sheet for one free court. Copy: “Any ready match can go next. Queue order is a suggestion, not a rule. A match only stays locked while one of its players is still on court or isn't present.”

One row per waiting match: “#P”, teams, “FORMAT · Ready to start” or the block reason, and **Put on court** (enabled only when ready), which opens Q-DISPATCH for that court.

## Q-ON-COURT — Getting ready

**Entry:** **Open match** on a court card showing **Getting ready**. The card's own primary **Start match** starts the match in one tap without opening this sheet.

Sheet for “Match N · Court X” with the **Getting ready** chip:

- **Teams** with switch sides (drag a player onto the other team, as on queue cards). The teams are not fixed until Start match.
- **Replace player:** swaps one player for a present player who is not busy. This is a plain lineup change: the new player is a full participant, no game-credit question is asked, and no substitution is recorded.
- **Move to another court:** lists free open courts (two for 5v5). Disabled when none is free.
- **Send back to queue:** the match goes to the **top** of the queue and the court frees. In Auto Queue the court is then refilled with the next eligible match other than this one. A match edited here goes back as a protected manual match.
- **Swap with #P** (in the row with Replace player and Move to another court; also in the court card's ⋯ menu as “Swap with #P · Match N”): a line under the row names the incoming match and says “this match takes its place at #P in the queue”. the next waiting match that is ready for this court (first in queue order, same number of courts, counting this match's players as free) goes on the court as Getting ready, and this match takes **that match's place** in the queue (not the top). Example: Match 1 on Court 1, queue Match 3, Match 4 → after the swap Match 3 is on Court 1 and the queue is Match 1, Match 4. Disabled when no other waiting match is ready. Like Send back, a match edited while On court goes back protected. Tapping it opens a confirmation, **Swap match N with #P?**: “Match M goes on Court X, getting ready. Match N takes its place at #P in the queue. Nothing starts until you tap Start match.”, then one before/after row for **Court X**: Match N (now) → Match M (after, accent border). Each card shows the match number and both teams; every picture carries the player's games this session as a badge (as on the court drawing) and, under the short name, minutes since their last game in the queue cards' wait colors (under 10 min plain, 10–15 min warning, 16+ error). The queue slot is described in the sentence only, not drawn. Actions **Cancel** (or **Back to match** when opened from this sheet) and **Swap matches**. Confirming rechecks that the same match is still next; if not: “Something changed. Review the match again.” Success closes the sheet with the toast “Match 3 swapped onto Court 1 · getting ready · Match 1 back to #1 in the queue”.
- **Start match** (primary): one tap, because the court is already chosen. ROTRA rechecks presence and busy players. On a problem: toast “Something changed. Review the match again.” and nothing starts. Success: “Match N started on Court X”. Repeated taps cannot start twice. The minutes-played timer starts now.

If a player in this match is marked not present, the sheet and the court card show the reason and **Start match** is disabled until the lineup is fixed (Replace player) or the match is sent back.

Players in a Getting ready match are busy: other matches that include them show “NAME is on Court X”.

## Q-ACTIVE-MATCH — Playing control

Sheet “Match N · Court X” with the **Playing** chip: “FORMAT · started HH:MM · M min in”, both teams with levels, one line per substitution (“Kiko replaced Jom. Neither gets credit for this game.”, or with a credit choice “Kiko replaced Jom · Kiko got the game (QM choice)”), and “The court stays in use until you confirm a winner or mark the match invalid. Closing this doesn't end the game.”

Actions: **Mark invalid** (destructive style), **Substitute player**, **Match done** (primary). No switching sides or dragging: a change during play goes through Q-SUBSTITUTE. No edit-level, change-past-result, or reset shortcut. No point-by-point scoring and no umpire product.

## Q-SUBSTITUTE — Mid-game replacement

Only for a **Playing** match. Sheet “Substitute in match N”, showing “Started M min ago”:

1. **Who's coming off?** — tiles for everyone in the match, each noting Team A or B.
2. **Replacement** — tiles for present players who are not in this match and not busy elsewhere (not On court or Playing); “No present player is free right now.” when none.
3. **Who gets this game?** — one choice: **Nobody** (default, the usual case) · **KIKO (coming in)** · **JOM (going off)**, with the real names. Never both. Choosing a person for a team slot replaces any earlier credit choice for that same slot. There is no automatic minute threshold; it is the Queue Master's courtesy.

**Review substitution** opens **Confirm substitution**: Out, In (with level), Team, the credit choice, and the warning. With **Nobody**: “Neither player's partial game will count toward their minimum or long-term performance.” With a person chosen, the warning says that person gets this game's count, minimum credit and win or loss for tonight, and that neither player's partial game counts toward long-term performance. Actions **Back** and **Confirm substitution**. Success returns to Q-ACTIVE-MATCH with “Kiko in for Jom”.

The choice locks when the match is done or invalid; an invalid match still gives nobody anything. The outgoing player stays on the match record. A change before Start match (Q-MANUAL while waiting, Q-ON-COURT while On court) is not a substitution and never asks this question.

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

## Q-NEXT-MATCH — Next-match picker after a result

**Owner decisions, November 9, 2026** ([log](../../../../mockup-changes/2026-11-09-queue-next-match-picker.md), issue #579):

1. **Left and right are two equal options.** Neither side is preferred; swipe or tap toward the one you want.
2. **Candidates** are the first two waiting matches in Main Queue order that are ready for the freed court: one court needed and not blocked (the same readiness check as Auto Queue and Q-CHOOSE-MATCH). No new ranking or pairing rule.
3. **The picker opens after every confirmed result**, in both Manual Queue and Auto Queue.

**Entry:** **Confirm Team X wins** on Q-MATCH-DONE. The match becomes done as before, then this sheet opens for the freed court (the first freed court of a 5v5 match; the other freed court is handled as before). With Auto Queue on, every other free court is filled as before, but the freed court is **not**: the picker replaces the automatic fill for that court.

**Sheet “Next on Court N”:** intro “Match N is done. Pick the match that goes on next. It goes on court getting ready; you start it from the court.” Two cards in a two-column grid, side by side at every width including 375 px (gap 8 px). Each card: a small muted “Left” / “Right” label, “#P” (queue position) and the format chip, Team A names, “vs”, Team B names (names wrap, never truncate), and a full-width primary **Pick this** (aria-label “Put match #P on Court N: Team A vs Team B”). Footer: **Skip for now**.

**Pick:** rechecks, then places the match **On court** (**Getting ready**, timer not started), exactly like Put on court. Toast “Match N on Court X · getting ready”. It never starts the match. If the match is no longer ready: error notice “That match is not ready any more. Pick again.”, candidates refresh, nothing is placed.

**Skip for now** (also Close, Escape and the backdrop): places nothing. Manual Queue leaves the court free. Auto Queue then fills that one court exactly as before.

| Candidates | Shows |
|---|---|
| Two | Both cards; on touch screens the hint “Swipe left or right to pick, or tap Pick this.” |
| One | Only that card, full width, with no empty second slot, no “Left/Right” label, no hint and no swipe; its **Pick this** is the only pick control |
| None | Notice “No ready match for Court N right now.” and only a **Close** button (behaves as Skip). No fake option |

**Touch swipe (coarse pointer, two candidates only):** a horizontal drag on the card pair moves it with the finger (slight tilt, at most 6 degrees). Dragging left highlights the left card (accent border, scale 1.02); dragging right highlights the right card. Release picks that side when the drag is at least 96 px (or 30 % of the pair width, whichever is smaller) and horizontal movement clearly dominates vertical (|dx| > 1.5 × |dy|); otherwise the pair snaps back in 150 ms and nothing happens. Vertical scrolling is never taken for a swipe. With reduced motion, no tilt or movement, only the highlight. Desktop (fine pointer): no drag; the two buttons pick. Keyboard: Left and Right arrow keys move focus between the two **Pick this** buttons; Enter or Space picks.

## Q-INVALID-MATCH — End without a counted game

Dialog **Mark match invalid?**: “Match N on Court X”, both teams, and “No game, win, loss, or minimum-game credit will be recorded. This decision cannot be changed.” Actions **Keep playing** (back to the match) and **Confirm invalid match** (destructive). No reason field.

Success frees all occupied courts: “Match N marked invalid · Court X free”.

## Q-MATCH-RECORD — Read-only outcome

In the [session record](results-sharing.md#q-history--session-record), each match shows “#N”, its time range, a Fun chip when relevant, both teams with the winning side highlighted “✓ Won”, the score or “no score” (or an **Invalid** chip), and “S substitutions; partial games not counted”, plus one line per substitution with a credit choice, e.g. “Kiko replaced Jom · Kiko got the game (QM choice)”.

## Acceptance examples

- Winner-only confirmation succeeds with no score values.
- Closing the score sheet before confirming does not release the court.
- A failed local write cannot display Match done or free the court.
- Invalidating a 5v5 game frees both courts and adds zero games to everyone.
- Once confirmed, even the Admin product offers no result correction.
- A ready match at #4 can be put on court while #1 is blocked.
- Putting a match on court does not start its timer; Start match does.
- In Auto Queue, a court freed by Match done shows the next ready match as Getting ready; nothing plays until Start match.
- A player in a Getting ready match cannot be put on another court (“Migs is on Court 1”).
- Send back to queue puts the match at #1 and frees the court; in Auto Queue the court gets a different match.
- Swap with the queue: Match 1 on Court 1 with queue Match 3, Match 4 → Match 3 Getting ready on Court 1, queue Match 1, Match 4.
- Replacing a player while Getting ready records no substitution and asks no credit question.
- A substitution with **Nobody** gives neither partial player anything; one with the incoming player gives them the game, the win or loss and minimum credit for the session, never long-term performance.
- An invalid match gives a credited substitute nothing.

A court before its planned start is visible but is not eligible for placement, and Auto Queue skips it. The planned end is advisory and does not prevent a new match. A player already in play remains a temporary dependency for any future lineup.
