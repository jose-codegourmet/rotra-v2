# Workstream — Queue offline

**Last verified:** 2026-11-12 (#722 landed; traced and type-checked, not run against Supabase) · [MVP hub](../README.md)

Paths: `real/` = `packages/data/src/real/`, `api/` = `apps/queue/src/app/api/`, `db/` = `packages/db/`.

## Goal

The Queue Master can keep running an active Queue Session without internet, within the boundaries of
[D-2026-11-07-03](../decisions.md#d-2026-11-07-03). Offline is mandatory for MVP; an online-only public
launch is not approved ([D-04](../decisions.md#d-2026-11-07-04)).

## In scope

Per D-03: session setup and start require internet. During an active session, downloaded club players
and newly entered guests may be added offline, alongside offline match and score operations. Global
ROTRA player search is online only. Session end/finalization requires reconnection, complete sync, and
Queue Master review of every unresolved guest (club saved players first, then the global directory when
online; explicit confirm or create a new unclaimed player). Durable device copy, outbox/replay, device
downloads and interruption recovery. See [Queue offline rules](../../business_logic/product/queue/modules/offline/README.md).

## Out of scope / deferred

- Offline session start (D-03).
- Expensive fuzzy matching, exhaustive same-name searches, automatic identity linking (D-03).

## Current state

| Capability | Status | Evidence | Tickets |
|---|---|---|---|
| Offline UI states (banner, sync pill, recovery screen, download card) | connected | Mock simulation (`data/src/sync/fetchers.ts`) and, in real mode, the outbox (`real/sync.ts` over `outbox/state.ts`): "Offline · N waiting to sync", Q-SYNC lists the outbox, Q-CONFLICT shows refused commands with Keep the server's version / Retry | #18, #385 closed; #722 |
| Online sync status / completeness read | implemented | `real/sync.ts:38-110` → `api/sync`, `api/sessions/[sessionId]/sync` → `db/src/queue/sync.ts:569,644` | #269 closed |
| Durable device copy (IndexedDB / storage) | implemented — copy + outbox + aliases in one IndexedDB database (`packages/data/src/device/deviceCopy.ts`, `outbox/outboxStore.ts`); offline writes rewrite the copy's bodies in the same transaction as the command | `real/client.ts` answers GETs from the copy offline and while the session has commands waiting; no service worker, so the page shell itself still needs the network | #477, #722 |
| Session download (offline copy) | implemented | `real/device.ts` `realDownloadSession` pre-warms the session's reads and writes one record per session and account; a drained replay downloads the copy again; `realGetDeviceDownloads` lists them; sign-out clears the account's copy, outbox and aliases; `playhistory.json` export/import (`outbox/playHistory.ts`) moves a copy between devices | #477, #722 |
| Outbox + replay | implemented (option A) | `outbox/dispatch.ts` (one door for every allowed write: mock path, real adapter, or local apply through `mock/store.ts` `withWorkingState` + outbox), `outbox/commands.ts` (registry name → real adapter), `outbox/replay.ts` (in order, own `operationId`, learned ids, 409 → conflict, other failures → attention, copy refreshed) | #722 |
| Server device streams, upload, seal, conflicts | not built for MVP (D-2026-11-11-04) | `db/src/queue/sync.ts:165-629` stays unrouted; the replay uses the ordinary command Route Handlers, and conflicts are the outbox's refused commands on the device | #253, #269 closed; #246 open |
| Interrupted-device answer | implemented over the outbox | `realAnswerInterruption` (`real/sync.ts`): Yes replays this device (awaiting original while offline), No clears the session's commands and removes the copy (`outbox/conflicts.ts`) | #722; #246 open for two-device conflicts |
| D-03: setup/start online only | implemented | Real mode is online only everywhere | — |
| D-03: offline add of downloaded club players + guests | implemented | `roster.batch`, `roster.addSaved`, `roster.addNew` in `outbox/commands.ts`; a guest made offline gets a local id, learned from the replay reply | #722 |
| D-03: global search online only | implemented | `real/queue.ts:500` → `api/players` | — |
| D-03: finalization requires reconnect + full sync + guest review | partially connected | `queue-session/finalization.ts` refuses Session done offline or with commands waiting; `canFinishAndSync` is online with an empty outbox; `reviewSessionDone` returns `unresolvedGuests` (roster guests without a profile, same-name saved players as candidates) and the sheet shows them as a notice. Not built: confirm-a-match (guest → saved player merge; no column records the link), create a new unclaimed player (RTR ID allocation), so the guest step does not block | #722; follow-up ticket needed |

Notes: every replayed command sends the outbox's own `operationId` (the adapters accept it), so a lost
reply and a retry never save twice. Known limits: Generate matches drafts › Add to Main Queue stays
online only (the drafts are a device working set outside the outbox); a match made offline shows a
temporary number until its replay; collision-free numbers across two offline devices are undecided.

## Remaining work

- [x] Durable read-only device copy + session download in real mode (#477). Offline writes/outbox: #722.
- [x] Outbox in IndexedDB, local apply through the existing reducers, replay through the existing real adapters, 409 → Q-CONFLICT, `playhistory.json` export/import in This device. #722 ([D-2026-11-11-04](../decisions.md#d-2026-11-11-04)); the device-stream routes (`uploadOperations`/`sealStream`) are not built for MVP.
- [x] Add downloaded club players and guests offline. #722.
- [x] Interruption answer + conflict review in real mode (refused outbox commands). #722. Two-device match conflicts: #246 (decision).
- [ ] Guest reconciliation at Session done: the review read and notice landed (#722); the confirm-a-match merge service, create-unclaimed-player (RTR ID) service and the sheet's actions need a ticket and an owner answer on recording the link (no column today).
- [ ] Generate matches drafts › Add to Main Queue offline (the drafts working set is outside the outbox).
- [x] Fix the real-mode console offline notice copy (#721).
- [x] Reconcile offline docs with D-03 (offline start): done by the 2026-11-11 start-session-online-only mockup change.

## Related decisions

- [D-2026-11-07-03](../decisions.md#d-2026-11-07-03) — offline boundaries and guest reconciliation.
- [D-2026-11-07-04](../decisions.md#d-2026-11-07-04) — offline mandatory for MVP.

## Blocking open decisions

- #246 offline design (device streams, conflicts, `match_no` allocation).
- [Database open decisions](../../database_design/product/open-decisions.md) (interrupted-device conflicts, collision-free `match_no` and court placement, duplicate offline club-player IDs) · [business open decisions](../../business_logic/product/open-decisions.md) · [screen open decisions](../../screens/product/open-decisions.md).
- Hub open questions 5 (phone "lookup pending" vs guest review) and 6 (who owns the offline tickets).

## Exit criteria

**Proposed — owner to confirm.**

- [ ] In real mode, a started Queue Session keeps working offline on a downloaded copy: add downloaded club players and guests, matches and scores.
- [ ] Offline work replays when internet returns, with no lost or duplicated operations.
- [ ] Session done is refused until reconnection, complete sync and Queue Master review of every unresolved guest.
- [ ] Setup, start and global player search stay online only.
