# Transaction boundaries and replay behavior

**Status:** Proposed command-level contracts, not implemented endpoints.

Use short transactions for canonical changes. Lock a session/club and related player/court keys in a consistent order; do not hold database locks while waiting for network calls or operator conflict review. Preserve retry identifiers across attempts.

## 1. Create/download and reserve a session

Create the session and initial scoped roster/courts online, together with its optional cost estimate and shuttle plan lines in the same transaction. Validate that plan lines reference the club's own shuttlecock items. A downloadable snapshot is tied to a server revision and enrolled device stream; it excludes estimates and inventory.

While the session is prepared and `minimum_is_calculated` is true, roster and setup changes recompute `minimum_games` in the same transaction; start freezes it.

Before granting permission to start offline, proposal: lock the club and acquire its unique session reservation, verify the license, and record the authorization evidence. A retry for the same session is safe; a different reserved session conflicts. Device 2 can enroll for the same session without creating another club-active-session entitlement.

No unique index alone coordinates two devices that never connected. Reservation timing/release and offline clock handling must be reviewed before implementation.

## 2. Save roster assessment / start session

Before start, insert a new immutable assessment revision, update the roster's selected level, increment revision, and enqueue a rank refresh once. Use a unique source operation key. Assessment and performance flows remain separate.

Starting the session checks reservation/authorization, refuses if any roster entry lacks a level, and locks all existing roster levels. Late entrants require a level locked on entry. Database command guards reject later edits to a locked level; generic profile writes cannot bypass this boundary.

## 3. Start, substitute, or finish a match

Start: lock session queue revision, verify the selected match is waiting and its participants are eligible, validate team sizes, acquire all player/court holds, record court usage, and mark active atomically. A conflicting hold rolls back the whole start.

Substitute: record outgoing/incoming participation boundaries, release/acquire the corresponding hold, and update the active lineup in one transaction. Preserve both partial histories; do not replace one participant ID with another.

Finish/invalid: validate the confirmed command, insert the unique immutable decision, close participation/court evidence, release holds, and update canonical state atomically. A repeated identical operation returns the accepted decision; a different terminal command becomes a conflict, never an overwrite.

A local offline command requires the equivalent atomic working-copy + outbox update. Its server acceptance occurs on sync; conflicting disconnected actions cannot be declared globally valid before reconciliation.

## 4. Regenerate the waiting queue

Lock/check `queue_revision`. Snapshot presence, locked levels, counters, and manual protection. Replace eligible generated drafts and manual drafts marked Needs attention, preserving healthy manual entries and all active matches. Commit a coherent queue and revision at once.

If a lineup or presence revision changes during generation, recompute or report stale input. Do not commit an expensive generation result against a different roster without validation. Heavy computation may happen outside the lock, followed by revision validation.

## 5. Resolve identity and allocate RTR ID

Use normalized phone uniqueness plus atomic city/day counter allocation in a transaction. Concurrent creators either insert one identity or retry and link to the winner. The counter/allocation belongs to the successful creation, not a device-local guess.

If a link would duplicate an existing club player, do not silently rewrite historical rows. Retain a pending link conflict for an explicit identity-resolution policy. ID/QR is an identifier, not an account credential.

## 6. Finalize a complete session

1. Verify online authorization, including any expiry exception.
2. Lock the session and validate current revision, all enrolled writable stream seals, contiguous accepted/resolved operations, and absence of unresolved terminal conflicts.
3. Refuse finalization while any match is active (v1 behavior until a closure policy is decided). Unused waiting drafts produce no facts. Do not silently manufacture winners or invalidate active games.
4. Insert one `session_finalizations` record and all authoritative finalized participation facts in the same canonical commit; use unique session/command and match/participant keys.
5. Transition the session to completed and enqueue projection work atomically. Invalid sessions instead produce no official facts or result jobs.
6. Worker projects rank eligibility, local summaries, and slides idempotently from that finalization. Each job has exactly one concrete source FK (assessment or finalization), a projection version, and a uniqueness key.

Rank calculations and image generation need not hold the finalization transaction open. The UI must distinguish accepted finalization from projections still processing; no stale/new leaderboard mixture should be presented as a fully refreshed result. Exact projection-visibility handling is a design choice still to settle.

If a retry follows a lost response, return the original finalization rather than applying wins again. Once finalized, refuse new unsanctioned operations beyond the sealed stream boundary.

## 7. Publish results

Confirm the caller owns the club and has the required access. Select a generated private result snapshot and explicit included slides; Off Day must be supplied explicitly on every command and defaults to excluded. Re-publishing replaces the selection and appends a publication event. Update publication/export authorization without altering match facts or rankings.

## 7a. Courts and time during a session

Add court: insert with `open_until` null (follows session end) or a validated time. Remove court: lock the court, verify no active hold and that another non-removed court remains, then soft-remove. Extend time: update `scheduled_end_at` under the session revision. All three work offline as ordinary sync operations.

Publication and player-rank updates are independent. Asset generation can retry using a stable export key; failed rendering does not un-finalize a session.

## 8. Renew versus delete public pages

Renewal: lock the club, append the approved term, refresh entitlement, and cancel the current expiry cycle atomically.

Deletion: lock/recheck the club and exact uncancelled cycle, verify continuing expiry past its six-month deadline, then remove only publication projections/assets. Jobs from an earlier cycle must exit after renewal. External asset deletion uses retryable work associated with that cycle; recheck authorization before making content unavailable.

## 9. Approve contacts across auth and app storage

Keep approval, provider application, and final application states distinct. An auth provider request cannot share the same PostgreSQL transaction. Use idempotent staged commands, uniqueness reservations as needed, and reconciliation for partial failure. Never acknowledge applied while login identifiers and the app's private contacts disagree.

No transaction described here adds a password column, new realtime channel, or a normal route for editing confirmed results.
