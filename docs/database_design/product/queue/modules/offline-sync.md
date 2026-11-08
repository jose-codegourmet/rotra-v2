# Offline sync and interruption records

**Status:** Design for #246, based on the owner decisions of November 8, 2026. This is not a migration or an implemented protocol. [Business rules](../../../../business_logic/product/queue/modules/offline/README.md) take precedence.

## Session and device lifecycle

- A Queue Master starts the session online. The server atomically checks that the club has no earlier session awaiting Session done, and marks this session active. A retry returns the same result.
- Any device can continue the active session offline with a usable session copy. A device without a copy obtains one online or imports the CSV transfer; a file cannot give a device data that was never exported. Offline use does not require prior server enrollment. Importing a file does not grant a server credential; online sync uses the existing club authorization.
- Each local copy has a random device-copy ID and a separate stream ID. IDs are created locally, not from a device clock. Registration occurs when the server first sees the stream. Registration is evidence of a known stream, not proof that no other stream exists.
- A device atomically saves a change to its durable JSON working log and outbox before reporting it saved. The log records the session ID, source stream, stable operation ID, monotonic per-stream sequence, operation type, target, payload, base revision and local timestamp. It retains original records and any Queue Master resolution. Browser storage persistence and quota failures must be surfaced, never reported as a successful save.
- A device with no changes has no new operations to send. It can report a zero-operation close when online; absence of such a close never proves an unknown or missing device has no changes. A closed stream cannot add operations past its declared sequence; new offline work requires a new stream. Closing one stream does not finish the session.
- Transfers carry the session snapshot and the operations needed to merge it, including stable IDs and source stream/sequence. Define a versioned CSV representation that round-trips the JSON log, escaping text correctly and validating the club and session. Reject unsupported or incomplete files with an actionable error; do not partially apply them. A transfer is private session data and does not include reusable sign-in credentials.

## Upload, merge and review

1. Authenticate the club online and verify session ownership and active state. Register previously unknown streams from valid operations; the server cannot infer unknown devices.
2. Store each immutable operation and its digest. An identical retry returns the prior receipt. Reusing an operation ID or a stream sequence with different content is a conflict; never replace the original. A repeated imported copy is deduplicated by the same IDs.
3. Track contiguous sequences for each stream. If sequence 3 arrives before 2, retain 3 as waiting and request 2; do not mark the prefix complete or apply dependent changes early. A missing sequence remains visible to the Queue Master.
4. Apply independent changes without a collision. Where incompatible changes affect the same match, court, player availability or payment, retain both versions and quarantine the collision. Local timestamps help identify suspicious ordering but do not select the winner or prove completeness; clocks may be wrong.
5. The Queue Master sees each version and its source, then chooses the correct result, timestamp, availability or payment status. Persist the decision, its actor and source-operation references. A disputed match the Queue Master cannot resolve may be marked invalid; it gives no winner or ranking credit. No automatic first-sync or last-sync winner.
6. Match identity uses a locally generated globally unique ID. An offline match can display a temporary label; the server assigns its final shared number on sync under a session lock. Never use the display number to deduplicate matches.

## Session done

Session done requires an online club session, server validation, all known pending operations processed or explicitly resolved, and the Queue Master's confirmation that device data has been synced or imported. Show known streams and last sync information where available. If a device's data is missing, warn that games and payments can be lost; the Queue Master may explicitly accept that risk and finish with available data. Store this confirmation and warning acknowledgement with the finalization. It is not proof that unknown devices contained no work.

Lock the club and session during final validation and finalization. If an upload changes the session revision before finalization, recheck the records and confirmation. Commit the final authoritative results and completion state together, with a stable finalization command ID; retries return the original result. Only this successful database commit makes the session done and permits a new session. Do not generate results from unmerged or invalid matches.

Reject late session operations from automatic application after Session done and preserve them for a future reviewed recovery process; reopening policy is not decided. A Queue Master may correct payment status after Session done via a separate audited update that cannot change match results. A confirmed online invalidation releases the club's active-session slot; it does not fabricate a successful Session done.

## Acceptance examples

- **Duplicate:** device A uploads operation 4 twice with the same ID and payload. Both replies refer to one receipt and one applied change.
- **Changed payload:** operation 4 is resent with a different winner. Preserve the original, flag the collision and require review.
- **Out of order:** operation 3 arrives before operation 2. Store 3 as waiting; process it only when its prerequisite arrives or the gap is reviewed.
- **Missing device:** A is online, B is unavailable. ROTRA warns that B may contain games and payments; the QM may explicitly accept missing data before finishing. ROTRA does not assert B was empty.
- **Contradictory result:** A says Team A won; B says Team B won. Keep both records and ask the QM. If the QM cannot determine the result, the match may be marked invalid.
- **Payment collision:** A records paid and B records not paid for the same player. Ask the QM; record the chosen state and the evidence. A later payment correction is separate from match results.
- **CSV transfer:** B imports A's export twice. Both imports represent the same operation IDs, so no change or game is counted twice. Import alone does not complete database sync.
