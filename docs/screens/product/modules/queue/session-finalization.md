# Whole-session finalization

**Surfaces:** `Q-SESSION-DONE`, `Q-FINALIZE-PROGRESS`, `Q-INVALID-SESSION`.

**Sources:** [session closure](../../../../business_logic/product/queue/modules/sessions/README.md), [results](../../../../business_logic/product/queue/modules/results/README.md), [offline integrity](../../../../business_logic/product/queue/modules/offline/README.md). **Reference:** [ROTRA Queue prototype](../../../../frames/queue-app/rotra-queue.html).

## Q-SESSION-DONE — Online closure review

**Entry:** **Session done** in the console footer. This closes the whole event, not one match. Disabled offline with “Connect to finish and sync this session.”

**Step 1 — Session done:** Session, Games recorded, Participants, Sync (“Complete” or “N changes waiting”). Notices:

- Games in play (error style): “N games are still in play (Court 1, Court 3). Finish or invalidate them first.” **The continue button is disabled** while any game is active. (The prototype's copy also says the final policy is undecided; that note is for reviewers, not product copy.)
- Unplayed waiting matches (info): “N waiting matches were never played and won't appear in results. What happens to unplayed matches is still undecided.”
- Shortfall (warning): “N players are below the minimum of M games.”

Actions **Back to session** and **Review shortfalls** (when anyone is below the minimum) or **Continue**.

**Step 2 — Some players are below the minimum** (only with shortfalls): each name with “g of M”; “Late arrivals, early leavers and real-world choices happen. You can still finish.” Actions **Back to session** and **Continue to finish session**. No reason is required.

**Step 3 — Finish this session?:** title and time; “N changes are still syncing.” (warning) or “All records on this device are synced.” (success); “Valid results sync to Player Information automatically, and ranks update. Result slides become available to you privately. Nothing is published until you choose to.” **Confirm Session done** is disabled while changes are pending or offline.

Integrity gate: if records from another device are missing or inconsistent, open the [interruption/recovery flow](offline-recovery.md). Being online is necessary but not sufficient.

## Q-FINALIZE-PROGRESS — Finishing

Heading “Finishing TITLE” with four stages, each marked done (✓), current (…), or pending:

1. Checking session records
2. Finishing the session
3. Updating player records
4. Preparing result slides

A live status line announces the current stage. When done, the results view opens with “Session finished · player records updated”.

These are UI stages, not separate APIs. Do not show fictitious percentages. If finalization committed but slides are still processing, show “Session finished; results are being prepared” and retry only the failed work. A lost response requires status recovery before resubmitting.

## Q-INVALID-SESSION — No official result

Shown in the [session record](results-sharing.md#q-history--session-record): chip **Invalid session** and “This session has no official result. REASON It doesn't count toward player records or rankings, and there are no standings or result slides. Its partial records aren't shown as match history.” Games show “—”; players show “Not counted”.

Do not offer Result slides, Publish, Download, Edit winners, or Reconstruct results. Invalidity is permanent. Whether declaring it invalid immediately releases the club's active-session slot still needs a rule.

## Acceptance examples

- Complete records plus low game counts can still finalize after acknowledgement.
- A game still in play blocks Session done until it is finished or invalidated.
- Pending sync changes keep Confirm Session done disabled.
- A finalization processing retry cannot create another finalization.
- Profile/rank updates happen whether or not the operator later shares slides.
