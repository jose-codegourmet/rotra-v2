# Queue generation and dispatch

**Last verified:** 2026-11-06.

**Status:** Confirmed v1 target rules. Updated October 26, 2026 to match the [ROTRA Queue prototype](../../../../../../apps/mockup/queue-app/rotra-queue.html). Updated November 6, 2026 for the owner's On court step and the Auto Queue / Manual Queue court switch ([log](../../../../../mockup-changes/2026-11-06-queue-on-court-and-sub-credit.md)).

> **Name change, November 6, 2026.** The draft generator was formerly called Auto Queue; renamed **Generate matches** on 2026-11-06. **Auto Queue** now names the court-fill switch ([below](#auto-queue-and-manual-queue-court-filling)). Code names (`AutoQueueMode`, `AutoQueueCount`, screen ID `Q-AUTO`) are unchanged for now.

## Ways to add waiting matches

| Choice | Behavior | Origin | Protected from Regenerate |
|---|---|---|---|
| Add match (manual) | Operator picks format and fills every Team A / Team B slot | Manual | Yes |
| Make match | Operator taps players in the Players view; ROTRA picks the format from the count and balances teams by level | Manual | Yes |
| Suggest | ROTRA proposes **one** lineup with a reason; operator adds it, edits it, or skips to the next suggestion | Suggested | No, unless edited |
| Generate matches | Generates alternative drafts; the Queue Master selects and explicitly adds them to the Main Queue | Auto | No |

Editing any waiting match makes it **Manual and protected**, and that includes switching two players between teams. Accepting a suggestion without edits keeps it unprotected, like transferred Generate matches output. A suggestion whose players were switched before it was added goes in protected.

**Switching sides.** Until **Start match**, the operator can move a player to the other team by swapping them with a player there. That includes a match that is On court (placed but not started). Team sizes stay the same, so a 1v2 stays 1v2. Swapping two teammates changes nothing. Once a match is Playing its teams are fixed. A change during play goes through a substitution.

All choices require the operator to confirm **Start match**. Nothing starts by itself when a court frees up, in Manual Queue or Auto Queue. Saving a lineup never takes a court; **putting a match on court** does (see [On court](../matches/README.md#lifecycle)).

### Make match

Selected-player count sets the format: 2 → singles, 3 → 1v2, 4 → doubles, 6 → 3v3, 8 → 4v4, 10 → 5v5. Other counts cannot make a match. Singles or doubles cannot be made when that format is off for the session. Teams are balanced by assigned level:

- Doubles: the pairing with the smallest difference in summed levels.
- Singles: higher level vs lower level. 1v2: the highest level alone against the next two.
- 3v3, 4v4, 5v5: sorted by level and dealt A, B, B, A, A, B, B, A, …

The match goes to the end of the queue.

### Manual editor

- Format buttons show the enabled standard formats plus all fun formats. The editor opens on Doubles if on, else Singles, else 3v3.
- Team sizes are fixed by the format. Every slot must be filled, and a player can take only one slot per match.
- A player who is playing now, or not present, can be placed in a later match. That match cannot start until they are free and present.

## Shared waiting list

There is **one queue for the session**, not one per court.

- Queue position is a **suggestion, not a rule**. Any waiting match that is ready can go on court, whatever its place.
- A free court proposes the **next eligible** match: the first ready match in queue order. If earlier matches were skipped, the court says why ("Skipped #1: Jom is playing on Court 2"). **Pick another** lists every waiting match with its status, and any ready one can be put on court there.
- Blocked matches keep their place.
- The operator reorders by dragging a match's handle (arrow keys on the handle do the same from the keyboard), and can remove a waiting match. Removing it records no game.

### Match status

| Status | Kind | Example |
|---|---|---|
| Ready to start | Eligible | — |
| Needs attention | Broken lineup | "Lineup is incomplete"; "Kat and Jo are not present" |
| Blocked | Temporary; resolves itself | "Migs is playing on Court 1"; "Migs is on Court 1" (an On court match) |
| Waiting for courts | Temporary | "Waiting for a free court"; "Needs two free courts" (5v5) |

A player may appear in multiple waiting matches but can never be in two On court or Playing matches at once.

## Pairing presets

The club selects one preset for the session and displays it for transparency. These are default styles, not restrictions on operator judgment.

| Mode | Intended experience |
|---|---|
| Chill | Aim for roughly 30% easy games per player across the session |
| Fair | Mainly level-matched games, with roughly 10% easy games |
| Hard | Permit demanding runs, including 2–3 consecutive games |

An easy game means the player's **team is favored to win**, whether because of partner strength or weaker opponents. Percentages are flexible goals, not guaranteed quotas.

Balanced teams matter, but reaching the minimum-game target takes priority over mode preferences. Automatic generation uses present players and the enabled singles/doubles formats; only Plan Ahead initially includes players currently playing. Fun formats are never generated.

### Previous prototype reference heuristic

The earlier single-batch prototype used this heuristic; it is not the approved Generate matches load or tie rule. It shows the intent; the exact strength model and pairing weights remain [open](../../../open-decisions.md).

1. Each present player has a load: games completed, plus 0.9 × waiting matches they are already in (not counted in Hard mode, which allows back-to-back games), plus a small random tie-breaker.
2. With both formats on, each run of three matches is two doubles then one singles (doubles only when at least 4 players are present).
3. Pick the lowest-load players for the match, then raise their load by one.
4. Split teams by the smallest level difference. In Chill (about 30% of the time) and Fair (about 10%), deliberately pick the most uneven split instead, to create an easy game.
5. A player with no level counts as a mid level.

Errors are explained, not hidden: "Singles and doubles are both off for this session" or "Only N players are present. Doubles needs 4."

### Suggest

The suggestion explains why: who is below the minimum (with games/target), or that everyone has met it and these players have the fewest games. Teams are split by assigned level to suit the mode. No win probabilities are shown.

### Generate matches workspace

Formerly called Auto Queue; renamed 2026-11-06. The Main Queue is the shared accepted waiting list. Generate matches holds separate alternative drafts in five tabs: Available Players, Plan Ahead, Longest Wait, Fewest Games and Catch Up. Generate on request after choosing 2, 3, 4 or 6 matches; no count is preselected. Available means present and not in play at generation; only Plan Ahead initially includes players in play, identified as dependencies. Repeated appearances in future matches are allowed; a player cannot be in two On court or Playing matches at once.

Generation accounts for current Main Queue assignments and earlier drafts within its batch as planned load. Longest Wait and Fewest Games use that load with longest wait and stable player order for ties. Catch Up uses an explicitly chosen target for completed games, prioritizes players below it, and fills from eligible players with the lowest planned load. It stops when the target is met in the plan, the chosen batch limit is reached, or no valid match can make progress; show the reason. This target is not the session minimum. Played counts only follow existing completed-match rules; queued counts derive from current Main Queue waiting matches. A draft is not a completed result and alternative tabs do not increase the Main Queue count. Existing team-balancing heuristics are prototype references, not newly approved pairing weights.

Selections persist across tabs in selection order. Review that order before adding selected drafts to the Main Queue. Add all applies to the current tab. Clear this tab and Generate again act on drafts; Replace unselected preserves selected drafts, and Remove unselected removes the others. A Main Queue change makes existing drafts stale without hiding them; revalidate on transfer and show conflicts for attention. A draft cannot be transferred twice; a distinct intentional rematch is allowed. Main Queue regeneration remains a separate control and retains its existing protected-manual rules.

## Auto Queue and Manual Queue (court filling)

**Owner decision, November 6, 2026.** Each session has one switch on the live console's Courts section: **Manual Queue | Auto Queue**. It starts on **Manual Queue** and can change at any time during the session. It only decides how matches get **onto** courts. Neither mode ever starts a match: the operator always taps **Start match**.

| Mode | What a free court does |
|---|---|
| Manual Queue | Shows the next eligible match (with the existing skip explanations). The operator taps **Put on court** (or **Pick another**). The match lands **On court**, not Playing |
| Auto Queue | ROTRA places the next eligible match **On court** straight away. Copy: "Free courts get the next ready match. You still start each one." |

**Auto Queue fills a court when:**

- the switch is turned on: every free open court is filled now, in court order;
- a court is freed by Match done, an invalid match, or **Move to another court**;
- a match is added to the queue while a court is free;
- a court opens or is added.

**Auto Queue skips:**

- 5v5 matches (always placed by hand, on two courts);
- courts that are not open yet.

The operator can still place those by hand. A court whose booking has ended **is** filled: its end time is a reminder, not a stop.

**Send back to queue in Auto Queue.** The sent-back match goes to the top of the queue, and the court is refilled with the next eligible match **other than** the one just sent back.

**Turning Auto Queue off** leaves On court matches where they are.

Generate matches and Regenerate never change On court matches; they are treated like Playing ones.

## Short on players

**Owner decision, November 6, 2026.** When the present players who aren't busy can't fill every free open court
with the session's standard format (doubles 4 a court, singles 2; doubles first when both are on), the live
console says so honestly:

- **Banner** above Courts, counting all present players against the open courts: how many courts can run and
  how many sit out each game, e.g. "7 players present: enough for 1 doubles court. 3 sit out each game."
  With both formats on it can read "enough for 1 doubles court and 1 singles court"; with too few for any
  game, "3 players present: not enough for a doubles game." The banner disappears once the free players can
  fill every free open court (or no court is free).
- **Free court:** a free open court that can't get a match because too few players are free says
  **"Not enough free players."** instead of "No waiting match can go on: …" or "The queue is empty."
  **Add match** stays available.
- Generate matches, Suggest and Auto Queue only fill what is possible; their existing copy and errors are
  unchanged. Nothing here changes queue order, pairing rules or the minimum.

## Attention and regeneration

When a player is no longer available, affected queued matches show **Needs attention** with the reason, using text and icon as well as color. The operator edits the lineup to swap the player, or regenerates.

Regenerate:

1. Never changes On court or Playing matches.
2. Rebuilds automatic and suggested (unprotected) waiting matches.
3. Keeps protected manual matches unless they need attention.
4. Rebuilds protected matches that need attention.
5. Puts rebuilt matches back in the queue slots of the ones they replace.

Before applying, the operator sees counts: automatic matches rebuilt, healthy manual matches kept, manual matches needing attention rebuilt, games in play untouched (On court matches count as untouched too). Regenerate is unavailable when the queue is empty or nothing would be rebuilt. If generation fails, the queue is left exactly as it was.

See [generation and dispatch flow](flow/generate-and-dispatch.md).
