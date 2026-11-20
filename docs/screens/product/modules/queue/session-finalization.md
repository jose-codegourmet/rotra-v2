# Whole-session finalization

**Surfaces:** `Q-SESSION-DONE`, `Q-FINALIZE-PROGRESS`, `Q-INVALID-SESSION`.

**Sources:** [session closure](../../../../business_logic/product/queue/modules/sessions/README.md), [results](../../../../business_logic/product/queue/modules/results/README.md), [offline integrity](../../../../business_logic/product/queue/modules/offline/README.md). **Reference:** [ROTRA Queue prototype](../../../../../apps/mockup/queue-app/rotra-queue.html).

## Q-SESSION-DONE — Online closure review

**Entry:** **Session done** in the console footer. This closes the whole event, not one match. Disabled offline with “Connect to finish and sync this session.”

**Step 1 — Session done:** Session, Games recorded, Participants, Sync (“Complete” or “N changes waiting”). Notices:

- Games in play (error style): “N games are still in play (Court 1, Court 3). Finish or invalidate them first.” **The continue button is disabled** while any match is **Playing**. (The prototype's copy also says the final policy is undecided; that note is for reviewers, not product copy.)
- On court matches never started (info; owner decision, November 6, 2026): “N matches on court weren't started and will be dropped.” They do not block Session done; they are dropped like waiting matches.
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

**Replaced November 20, 2026 ([D-2026-11-20-01](../../../../mvp/decisions/2026-11-20.md#d-2026-11-20-01); [log](../../../../mockup-changes/2026-11-20-queue-record-games-not-ranked.md); mockup only):** with Record games off the games are recorded as usual; only their wins stay out of the leaderboards and win rate. Finishing runs all four steps as usual and opens the result slides. Toast: “Session finished · player records updated, not ranked”. The November 18 text below is what the mock app still runs.

**Record games off (owner, November 18, 2026; [D-2026-11-18-06](../../../../mvp/decisions/2026-11-18.md#d-2026-11-18-06); [log](../../../../mockup-changes/2026-11-18-queue-record-games-option.md); mock app).** The screen shows **two** stages, Checking session records and Finishing the session; “Updating player records” and “Preparing result slides” never appear, because nothing goes to player records and no slides are made. When done, the [session record](results-sharing.md#q-history--session-record) opens instead of the result slides, with the toast “Session finished · games not recorded”. The failure states are those of a run that stops before commit: the session stays running and Try again re-runs both stages; there is no “results are being prepared” state. A recorded session shows none of this.

## Q-INVALID-SESSION — No official result

Shown in the [session record](results-sharing.md#q-history--session-record): chip **Invalid session** and “This session has no official result. REASON It doesn't count toward player records or rankings, and there are no standings or result slides. Its partial records aren't shown as match history.” Games show “—”; players show “Not counted”.

Do not offer Result slides, Publish, Download, Edit winners, or Reconstruct results. Invalidity is permanent. Whether declaring it invalid immediately releases the club's active-session slot still needs a rule.

## Acceptance examples

- Complete records plus low game counts can still finalize after acknowledgement.
- A game still in play (Playing) blocks Session done until it is finished or invalidated.
- A Getting ready (On court) match that never started does not block Session done; the review says it will be dropped.
- Pending sync changes keep Confirm Session done disabled.
- A finalization processing retry cannot create another finalization.
- Profile/rank updates happen whether or not the operator later shares slides.
