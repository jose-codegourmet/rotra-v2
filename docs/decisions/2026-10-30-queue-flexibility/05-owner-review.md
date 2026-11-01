# Queue flexibility: owner review

Date: 2026-10-31 (Asia/Manila). The product owner approved the recommended choices in the conversation requesting issue #283. These decisions supersede the corresponding open gates in the earlier snapshots. They specify the mock/prototype contract; they do not authorize database work or change permanent results.

## G1 · Prepared capacity

Prepared admission uses the slot budget (courts × players per court), not `expectedPlayers`, which remains an input to the minimum-games estimate. Additional players go to the waitlist by default; the Queue Master may explicitly use **Give slot anyway**. During an active Queue Session, additional players, including walk-ins and any chosen waitlisted player, may be admitted directly above the budget. Admitted late players are present and their level is locked. Starting does not automatically admit waitlisted players.

## G2 · Court boundaries

Show courts before their planned start but exclude them from dispatch until that time. The planned end is advisory and does not interrupt a match or prevent another one. An overnight end is explicitly shown as the following day; the booking window must fall within the Queue Session. A start may be edited before the court has hosted a match; after use it is fixed. The Queue Master may extend the planned end, including after the original end. Manual closure uses free-court removal; occupied-court removal remains blocked and at least one court must remain. This does not introduce a reopen lifecycle or change cost or minimum-games formulas.

## G3 · Generation

The existing 2 / 3 / 4 / 6 match-count choice requires an explicit selection, without a preselected default. The four non-Catch Up strategies account for Main Queue assignments and earlier drafts in the current batch as planned load. Break ties by longest wait, then stable player order. In-play assignments are dependencies, not completed games; only Plan Ahead initially includes players currently playing.

For Catch Up, the Queue Master explicitly chooses a completed-game target. Prioritize eligible players below it and fill with other eligible players, preferring the lowest planned load; break ties by longest wait, then stable player order. Stop when the target is met in the plan, the selected batch limit is reached, or another valid match cannot make progress. Show the stopping reason. Planned matches are not completed games. This target is separate from the session minimum. These decisions do not authorize new team-pairing weights.

## G4 · Draft transfer

Keep selections across tabs in selection order and show that order for review before adding to the Main Queue. **Add all from this tab** applies only to the current tab. Preserve selected drafts during **Regenerate unselected**. After a Main Queue change, keep drafts visible and mark them stale; revalidate on transfer and require attention to conflicts. Prevent the same draft from being submitted twice while allowing a separately generated intentional rematch. Keep Main Queue regeneration clearly separate from draft regeneration.

## Handoff

These decisions are reconciled into the business and screen specifications, terminology, states, dialogs, flows and canonical Queue prototype under `apps/mockup/queue-app/`. The dependent mock implementation and its verification limits are recorded in [mock implementation evidence](06-mock-implementation.md). Database design needs a later reconciliation; no backend work is authorized here.
