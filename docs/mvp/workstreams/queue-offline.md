# Workstream — Queue offline

**Last verified:** 2026-11-07 (code audit of `main` @ `51abb94f`; traced, not run) · [MVP hub](../README.md)

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
| Offline UI states (banner, sync pill, recovery screen, download card) | partially connected | Mock simulation only (`data/src/sync/fetchers.ts`, `queue-session/mutations.ts:264`); route `sessions/[sessionId]/recovery/page.tsx` | #18, #385 closed |
| Online sync status / completeness read | implemented | `real/sync.ts:38-110` → `api/sync`, `api/sessions/[sessionId]/sync` → `db/src/queue/sync.ts:569,644` | #269 closed |
| Durable device copy (IndexedDB / storage) | partially connected — read-only copy in IndexedDB (`packages/data/src/device/deviceCopy.ts`): downloaded sessions stay viewable offline; no offline writes/outbox | `real/client.ts` keeps successful GETs of a downloaded session and answers them offline; `device/deviceIndex.ts` indexes the records; no service worker, so the page shell itself still needs the network | #477 |
| Session download (offline copy) | partially connected — read-only copy in IndexedDB (`packages/data/src/device/deviceCopy.ts`): downloaded sessions stay viewable offline; no offline writes/outbox | `real/device.ts` `realDownloadSession` pre-warms the session's reads and writes one record per session and account; `realGetDeviceDownloads` lists them (empty storage → empty list, unreadable storage → load failure); sign-out clears the account's copy | #477 |
| Outbox + replay | not implemented | `realRequest` refuses when offline (`real/client.ts:44`); `realGetSyncLog` empty (`real/sync.ts:66`) | #722 |
| Server device streams, upload, seal, conflicts | partially connected | `db/src/queue/sync.ts:165-629` (`registerDevice`, `enrollStream`, `uploadOperations`, `sealStream`, `resolveConflict`, `resumeSessionStreams`); no route calls them | #253, #269 closed; #246 open |
| Interrupted-device answer | not implemented | `realAnswerInterruption` throws (`real/sync.ts:112`) | #246 open/blocked |
| D-03: setup/start online only | implemented | Real mode is online only everywhere | — |
| D-03: offline add of downloaded club players + guests | not implemented | Needs device copy + outbox | #722 |
| D-03: global search online only | implemented | `real/queue.ts:500` → `api/players` | — |
| D-03: finalization requires reconnect + full sync + guest review | not implemented | `db/src/queue/finalization.ts:104` review has no guest step; no candidate-match search; `canFinishAndSync: true` always (`real/sync.ts:47`) | #722 |

Notes: online writes already carry an `operationId` (idempotent), a base for the outbox. The real-mode
console offline notice still says changes save on this device (`docs/architecture.md:297`).

## Remaining work

- [x] Durable read-only device copy + session download in real mode (#477). Offline writes/outbox: #722.
- [ ] Outbox in IndexedDB, local apply through the existing reducers, replay through the existing real adapters, 409 → Q-CONFLICT, `playhistory.json` export/import in This device. #722, engine decided November 11, 2026 ([D-2026-11-11-04](../decisions.md#d-2026-11-11-04)); the device-stream routes (`uploadOperations`/`sealStream`) are not built for MVP.
- [ ] Add downloaded club players and guests offline. #722.
- [ ] Interruption answer + conflict review in real mode. #246 (decision); implementation #722.
- [ ] Guest reconciliation at Session done (club first, then global; explicit confirm or create unclaimed). #722 (D-03).
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
