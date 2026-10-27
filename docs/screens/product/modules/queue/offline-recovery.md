# Offline readiness, sync, and interrupted-device recovery

**Surfaces:** `Q-SYNC`, `Q-DEVICE-CONTINUE`, `Q-INTERRUPTION`, `Q-CONFLICT`, `Q-UNRECOVERABLE`.

**Sources:** [offline business rules](../../../../business_logic/product/queue/modules/offline/README.md), [proposed sync design](../../../../database_design/product/queue/modules/offline-sync.md).

## Q-SYNC — Sync status and pending work

Entry: the persistent top-bar sync indicator or download/readiness status. Show current connectivity, last successful sync, locally saved pending work count when reliable, and a bounded list of actions needing attention.

**Sync status dialog.** Tapping the top-bar pill opens **Sync status**:

- A status banner: **Online and synced** (“Everything on this device synced. Last sync HH:MM.”), **Syncing…** (“Uploading N changes from this device.”), or **Working offline** (“N changes saved on this device, waiting for internet. They sync automatically when you reconnect.”).
- **Waiting to sync · N** (only when something is pending): changes grouped by the part of the session they touched, with a count per group and each change's text and time. Groups: Roster, Session, Session setup, Queue, Matches and results, Courts and time, Session done, Published results.
- **Synced from this device**: the most recent synced changes, grouped the same way.
- Footer note: it shows this device's changes only; another device's changes appear after that device syncs, and the public page updates only from synced data. **Close** is the only action, because sync runs automatically.

The dialog must not claim the whole session is complete just because this device has nothing pending (see the missing-device rule below).

Prototype indicator states (top bar, every operator screen): **Synced HH:MM**, **Syncing…**, **Offline · N waiting to sync**, **Working offline**. Every offline action's toast ends “· Saved on this device, waiting to sync”. On reconnect, sync runs automatically and reports “Synced N changes”. Offline-disabled controls explain why (“Saving needs an internet connection.”, “Downloading needs an internet connection.”, “Connect to finish and sync this session.”, “Publishing needs internet.”).

Do not label “all synced” merely because the latest upload returned successfully. If another enrolled device has outstanding data, explicitly say session records are incomplete.

Supported offline actions on a downloaded session: start the session, create/edit waiting matches, generate pairings, change presence, add arrivals as new players, add/remove free courts, extend time, start matches, substitute, confirm winners, and mark matches invalid. Saving must survive a page/view change and normal app interruption; implementation must verify durable storage.

Online-only: new-session creation, first download, uncached global identity lookup/claim-link issuance, and Session done. Contact approval and global rank calculation are server-backed, not offline features.

| State | Content and recovery |
|---|---|
| Downloaded, offline | “Working offline”; pending save status; keep permitted controls usable |
| Reconnected | Automatic sync with progress; no repeated manual Upload requirement |
| Retryable network error | Preserve local work; Retry sync; do not reset queue |
| Identity/link conflict | Show affected local player and candidate identity; no name-only merge |
| Match conflict | Route to Q-CONFLICT; ordinary game editor remains locked |
| Local storage failure/full | Explain unsaved action; avoid claiming success; do not recommend clearing unsynced data |
| Authorization expired | Show whether this active session has finish/sync permission; do not delete local evidence |

Manual Retry sync is a recovery aid, not the only way automatic resync happens. A page refresh or logout must not be presented as a safe fix without first preserving unsynced records.

## Q-DEVICE-CONTINUE — Continue on device 2

Show the same session and the latest snapshot available on this device. Explain that original-device changes may still be missing. Continue recording new matches is permitted; finalization remains blocked until the required original records arrive.

Device 2 needs an existing download or internet to obtain one. The exact enrollment/start-authorization procedure is a technical proposal, not yet a fixed user flow. Do not show “Restore device 1” if the data exists only on a dead offline device.

The presence/queue view may be stale; show that fact clearly. Manual edits on device 2 remain attributable to that device without pretending the application knows which human used shared credentials.

## Q-INTERRUPTION — Integrity question

Trigger only when finalization detects missing/inconsistent records, **not** merely low games per player. Display the incomplete record summary and request sync.

Question: **“Was the session interrupted?”**

- **Yes:** explain that the original device must reconnect; open recovery progress.
- **No:** explain that the inconsistent session cannot be recorded and will be invalid, with no leaderboard or performance contribution. Require a final explicit invalidation confirmation before applying this consequence.

No is not an “ignore warning and finish” button. Returning/backing out leaves finalization pending and does not silently choose either answer.

## Q-CONFLICT — Review original-device records

After original-device upload, show conflicts grouped by match/player where possible. Each item identifies the original recorded teams, scores/winner if any, device/source, and relevant sequence in ordinary language. Do not expose raw payloads, tokens, hashes, or database identifiers in the main UI.

The operator is required to review and clarify winners, but the exact authority-selection mechanism for two different confirmed outcomes is unresolved. Show this as a decision gate in implementation: no ordinary score editor, no last-write-wins, and no invented “override both” button. A resolved state requires a supported reconciliation rule and preserved evidence.

Uncontested permanent results remain read-only. While conflicts remain, Session done stays blocked. A refreshed summary should show which items remain unresolved without dropping earlier review choices.

## Q-UNRECOVERABLE — Original records unavailable

If device 1 is permanently lost/broken and original unsynced records cannot be recovered, show the invalid-session consequence. No manual reconstruction form, substitute score entry, or Admin rescue action is offered.

An invalid session contributes no official game history, wins/losses, performance, or result slides. Retained operator diagnostic data must not be presented as official leaderboard data.

Once declared invalid, the session remains invalid, even if the original device later reconnects. Do not offer Reopen or restore its results into official player history. This follows the explicit conversation decision; older planning notes that leave revival undecided do not override it.

## Acceptance examples

- Device 2 can keep recording but cannot finalize while device 1 data is missing.
- An unmet minimum with complete records shows a minimum warning, not this interruption question.
- A lost original device cannot be bypassed by manually typing remembered scores.
- Auto-resync retries never duplicate a match or award wins twice.
