# Flow: update rank and eligibility

## Roster assessment

1. The operator sees the profile's suggested rank while preparing a roster.
2. They assign/confirm the local level (one of the nine).
3. Save that club's assessment. When online/synced, it immediately updates the assessment contribution.
4. Within the rolling window, use only that club's latest assessment, with equal weight to other contributing clubs.
5. Lock the session level at session start, or on entry for a late arrival.

## Valid session finalization

1. Reconcile the session online and confirm Session done.
2. Apply each eligible standard-match result once, using participation and session-level context.
3. Exclude invalid/fun/partial performance contributions.
4. Combine recent assessments and recent performance using the configured weights, once the numerical model is separately specified.
5. Re-evaluate rolling standard-match eligibility and reassessment state.
6. Update public profile/rank and eligible overall leaderboard placement. Do not wait for club publication.

## Ageing out

Remove expired observations from the three-month input window. Preserve the previous visible rank with Needs reassessment when inactivity requires it. Eligibility can lapse due to fewer than the configured recent standard matches even without three full months of inactivity.

Exact window boundaries and the mechanics of scheduled recalculation remain implementation decisions.
