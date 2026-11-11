# Flow: generate, place, start, and regenerate

Generate matches was formerly called Auto Queue; renamed 2026-11-06.

1. The operator marks roster players present.
2. Add waiting matches by Add match, Make match (select players), Suggest, or selecting Generate matches drafts and reviewing their transfer to the Main Queue.
3. Generate matches works in the selected strategy tab using enabled formats, presence, played and queued counts and planned load; its drafts remain separate until transfer. With **Bagging mode** on (doubles), listed bagging pairs that apply to their next game are kept together as partners in every tab ([rules](../README.md#bagging-mode-and-bagging-pairs)).
4. The operator reorders, edits, or removes waiting matches. Edited matches become protected manual matches.
5. When a court is free, it proposes the first ready match in queue order and explains any skipped ones. The operator can pick any other ready match instead.
6. **Put on court.** In Manual Queue the operator reviews the match, chooses the court (two courts for 5v5), and taps **Put on court**. In Auto Queue ROTRA places the next eligible match itself (never a 5v5, never on a court not open yet; a court whose booking ended still fills). Either way the match is now **On court**, not started, and its players are busy.
7. While On court the operator can switch sides, replace a player, **Move to another court**, **Send back to queue** (to the top of the queue; the court frees, and in Auto Queue refills with a different match), or **Swap with the queue** (the next ready match takes the court, and this match takes its queue place).
8. **Start match.** The operator taps Start match on the On court match. ROTRA rechecks presence and busy players; the timer starts now.
9. Match done or invalidation releases the court(s). In Auto Queue the freed court gets the next ready match On court. Repeat.

## Availability changes

1. The operator marks a player not present, or a lineup is incomplete.
2. Affected waiting matches show Needs attention with the reason. An affected On court match shows the reason on its court, and Start match is disabled until the lineup is fixed (Replace player) or the match is sent back.
3. The operator edits the lineup to swap in an available player, or selects Regenerate.
4. Regenerate rebuilds unprotected waiting matches and protected ones needing attention, in the same queue slots. It keeps healthy protected matches and every On court and Playing match.

New arrivals do not authorize silently replacing the operator's protected queue edits. The operator controls queue changes.
