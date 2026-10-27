# Queue generation and dispatch

**Status:** Confirmed v1 target rules. Updated October 26, 2026 to match the [ROTRA Queue prototype](../../../../../frames/queue-app/rotra-queue.html).

## Ways to add waiting matches

| Choice | Behavior | Origin | Protected from Regenerate |
|---|---|---|---|
| Add match (manual) | Operator picks format and fills every Team A / Team B slot | Manual | Yes |
| Make match | Operator taps players in the Players view; ROTRA picks the format from the count and balances teams by level | Manual | Yes |
| Suggest | ROTRA proposes **one** lineup with a reason; operator adds it, edits it, or skips to the next suggestion | Suggested | No, unless edited |
| Auto queue | ROTRA adds several matches at once; operator picks 2, 3, 4, or 6 | Auto | No |

Editing any waiting match makes it **Manual and protected**, and that includes switching two players between teams. Accepting a suggestion without edits keeps it unprotected, like Auto queue output. A suggestion whose players were switched before it was added goes in protected.

**Switching sides.** Before a match starts, the operator can move a player to the other team by swapping them with a player there. Team sizes stay the same, so a 1v2 stays 1v2. Swapping two teammates changes nothing. Once a match is on court its teams are fixed. A change during play goes through a substitution.

All choices require the operator to confirm **Start match**. Nothing starts by itself when a court frees up. Saving a lineup never takes a court.

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

- Queue position is a **suggestion, not a rule**. Any waiting match that is ready can start, whatever its place.
- A free court proposes the **next eligible** match: the first ready match in queue order. If earlier matches were skipped, the court says why ("Skipped #1: Jom is playing on Court 2"). **Pick another** lists every waiting match with its status, and any ready one can start there.
- Blocked matches keep their place.
- The operator reorders by dragging a match's handle (arrow keys on the handle do the same from the keyboard), and can remove a waiting match. Removing it records no game.

### Match status

| Status | Kind | Example |
|---|---|---|
| Ready to start | Eligible | — |
| Needs attention | Broken lineup | "Lineup is incomplete"; "Kat and Jo are not present" |
| Blocked | Temporary; resolves itself | "Migs is playing on Court 1" |
| Waiting for courts | Temporary | "Waiting for a free court"; "Needs two free courts" (5v5) |

A player may appear in multiple waiting matches but can never be in two active games.

## Pairing presets

The club selects one preset for the session and displays it for transparency. These are default styles, not restrictions on operator judgment.

| Mode | Intended experience |
|---|---|
| Chill | Aim for roughly 30% easy games per player across the session |
| Fair | Mainly level-matched games, with roughly 10% easy games |
| Hard | Permit demanding runs, including 2–3 consecutive games |

An easy game means the player's **team is favored to win**, whether because of partner strength or weaker opponents. Percentages are flexible goals, not guaranteed quotas.

Balanced teams matter, but reaching the minimum-game target takes priority over mode preferences. Automatic generation uses only present players and the enabled singles/doubles formats. Fun formats are never generated.

### Reference heuristic

The prototype uses this heuristic. It shows the intent; the exact strength model and pairing weights remain [open](../../../open-decisions.md).

1. Each present player has a load: games completed, plus 0.9 × waiting matches they are already in (not counted in Hard mode, which allows back-to-back games), plus a small random tie-breaker.
2. With both formats on, each run of three matches is two doubles then one singles (doubles only when at least 4 players are present).
3. Pick the lowest-load players for the match, then raise their load by one.
4. Split teams by the smallest level difference. In Chill (about 30% of the time) and Fair (about 10%), deliberately pick the most uneven split instead, to create an easy game.
5. A player with no level counts as a mid level.

Errors are explained, not hidden: "Singles and doubles are both off for this session" or "Only N players are present. Doubles needs 4."

### Suggest

The suggestion explains why: who is below the minimum (with games/target), or that everyone has met it and these players have the fewest games. Teams are split by assigned level to suit the mode. No win probabilities are shown.

### Auto queue

Shows mode, formats, present count, and priority ("players furthest below the minimum first"). The operator picks 2, 3, 4, or 6 matches. The prototype preselects 3; the default is not decided.

## Attention and regeneration

When a player is no longer available, affected queued matches show **Needs attention** with the reason, using text and icon as well as color. The operator edits the lineup to swap the player, or regenerates.

Regenerate:

1. Never changes active matches.
2. Rebuilds automatic and suggested (unprotected) waiting matches.
3. Keeps protected manual matches unless they need attention.
4. Rebuilds protected matches that need attention.
5. Puts rebuilt matches back in the queue slots of the ones they replace.

Before applying, the operator sees counts: automatic matches rebuilt, healthy manual matches kept, manual matches needing attention rebuilt, games in play untouched. Regenerate is unavailable when the queue is empty or nothing would be rebuilt. If generation fails, the queue is left exactly as it was.

See [generation and dispatch flow](flow/generate-and-dispatch.md).
