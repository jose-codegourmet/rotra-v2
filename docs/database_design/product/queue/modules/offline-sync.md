# Offline sync and interruption records

**Status:** Proposed protocol/storage design. It does not resolve the remaining business question about contradictory confirmed winners.

## Records

| Record | Key fields and constraints |
|---|---|
| `devices` | UUID PK; club/account FK; registration time; device label; revoke metadata. A device is not a separate human manager |
| `device_session_streams` | UUID stream PK; club/session/device FKs; positive `generation_no`; unique `(session_id, device_id, generation_no)`; downloaded server revision; contiguous acknowledged sequence; nullable sealed final sequence; state |
| `sync_operations` | UUID operation PK; stream FK; positive sequence; entity ID/type; command kind; base revision; payload version; payload/digest; occurred/received time; acceptance state; unique `(stream_id, sequence)` |
| `sync_conflicts` | UUID PK; session FK; implicated operation IDs; category; state; resolution evidence and actor. Do not store only a free-text winner correction |
| `session_finalizations` | Session ID PK; unique command ID; verified stream manifest/digest; accepted session revision; completion time; policy version; state/digest of fact publication |
| `projection_jobs` | UUID PK; source finalization/assessment ID; projection kind/version; unique source+kind+version; retry status and attempt metadata |

Keep FK-bearing conflict references relational; a versioned payload can hold diagnostic evidence. Sensitive intake fields in sync payloads are private and excluded from public exports/logging.

## Device working copy

A session download contains only required roster/court/match/settings records and allowed profile display data, plus server revision and session-scoped authorization. Keep a durable outbox with stable operation IDs and monotonic stream sequence.

An accepted local command and its outbox entry must be saved atomically on the device; otherwise a crash could show a confirmed winner with no recoverable operation. Local storage technology and eviction behavior must be validated before implementation.

Device 2 must already possess a valid downloaded snapshot or get one online. The user authorized recovery, not magic access to data that was never downloaded. Enroll every writable device stream online before offline use; this is a technical proposal needed for server-side completeness detection.

## Upload and replay

1. Authenticate the club/device and verify session scope/authorization.
2. Persist the operation envelope once. The same ID/sequence and digest returns the same acknowledgement on retry. Reuse with different content is a conflict/error, not an update.
3. Track the **contiguous** received/validated prefix, not just the highest sequence seen. A receipt at sequence 20 does not prove 1–19 arrived.
4. Apply causal commands only after prerequisites arrive. Compare base revisions; quarantine conflicts rather than silently replacing state.
5. Accept a canonical mutation and its acceptance receipt atomically. Jobs use unique source keys to avoid duplicate performance application.
6. Return the server revision and per-operation status so the device can distinguish received, accepted, rejected, and conflicted data.

No timestamp-based last-write-wins for confirmed winners, presence dependencies, court occupancy, or frozen levels.

## Finalization barrier

Proposal: each enrolled writable stream submits a final seal identifying its last durable operation sequence and digest. Require a complete accepted/explicitly resolved prefix through every seal, no pending terminal conflicts, and a stable aggregate session revision.

A seal cannot be fabricated by another device on behalf of missing original records. Reject new operations beyond a sealed/finalized boundary or route them to explicit investigation; never silently mutate a finalized session.

Lock the session and manifest while confirming finalization. If a concurrent upload changes the revision, re-check rather than finalizing an old snapshot. Session done is online only.

A downloaded stream that never wrote still needs a trustworthy close/zero-operation acknowledgement; the exact handling is open. The server cannot prove absence of work on a never-enrolled device, which is why unrestricted offline device enrollment is incompatible with this guarantee.

## Interruption outcomes

Missing/inconsistent records trigger the interrupted-session question. Yes requires original-device uploads and review. No invalidates the inconsistent session. Permanently unrecoverable original records leave it invalid; manual reconstruction is forbidden.

Minimum-game shortfalls are not a completeness signal. Invalid sessions produce no official match facts, rankings, or slides. Retain only whatever non-counting diagnostic data a later retention policy permits.

Separate sync conflict storage from canonical terminal decisions so unresolved contradictions cannot accidentally become player history. See [transactions](../../transactions.md) and [open decisions](../../open-decisions.md).
