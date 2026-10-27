# Flow: generate, dispatch, and regenerate

1. The operator marks roster players present.
2. Add waiting matches by Add match, Make match (select players), Suggest, or Auto queue.
3. Automatic generation considers enabled standard formats, locked session levels, game counts, waiting load, and the chosen mode.
4. The operator reorders, edits, or removes waiting matches. Edited matches become protected manual matches.
5. When a court is free, it proposes the first ready match in queue order and explains any skipped ones. The operator can pick any other ready match instead.
6. The operator reviews the match, chooses the court (two courts for 5v5), and confirms **Start match**.
7. Match done or invalidation releases the court(s). Repeat.

## Availability changes

1. The operator marks a player not present, or a lineup is incomplete.
2. Affected waiting matches show Needs attention with the reason.
3. The operator edits the lineup to swap in an available player, or selects Regenerate.
4. Regenerate rebuilds unprotected waiting matches and protected ones needing attention, in the same queue slots. It keeps healthy protected matches and every active match.

New arrivals do not authorize silently replacing the operator's protected queue edits. The operator controls queue changes.
