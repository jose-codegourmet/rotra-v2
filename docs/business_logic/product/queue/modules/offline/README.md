# Offline operation and recovery

**Status:** Confirmed v1 target rules. This is a core requirement, not an optional later enhancement. Updated October 26, 2026 to match the [ROTRA Queue prototype](../../../../../../apps/mockup/queue-app/rotra-queue.html); online boundaries updated November 7, 2026 for MVP by [D-2026-11-07-03](../../../../../mvp/decisions.md#d-2026-11-07-03).

## Owner decisions — November 11, 2026 (#722, [D-2026-11-11-04](../../../../../mvp/decisions.md#d-2026-11-11-04))

- **Engine (option A).** Every change made offline on a downloaded, started session is recorded as a
  command (name, arguments, `operationId`) in an IndexedDB **outbox** and applied locally by running the
  existing mock-store reducers over the downloaded snapshot. When internet returns, the commands replay in
  order through the existing real adapters (every online write already carries an idempotent
  `operationId`). A server disagreement (409) goes to **Q-CONFLICT** for Queue Master review. The full
  device-stream protocol of offline-sync.md is not built for MVP.
- **Nothing is lost on reload or restart:** the local copy and the outbox are durable on the device.
- **Play-history file, for non-technical rescue.** Club settings › This device has **Export play history**
  (downloads `playhistory.json`: the downloaded session, its local changes and the outbox) and **Import
  play history…** (loads such a file onto this device). The file is the fallback when a device dies or a
  session must move to another device; importing is not a database sync, the imported commands join this
  device's outbox and replay like its own. This replaces the "CSV export/import" wording below.
- Session done still needs internet, complete sync and the guest review of D-2026-11-07-03.

## Owner decisions — November 8, 2026 (#246)

These decisions supersede older conflicting offline and recovery rules below and in the linked flow.
They describe the target, not functionality currently implemented.

- A session starts and ends online. A club cannot start another until the previous session is done;
  Session done requires the final data to be synced to the database.
- Any device may work offline during the active session. Offline work includes adding or removing
  guests, changing availability, queue management and Auto Queue, and recording payments. Registered
  players cannot be deleted offline.
- Each device keeps a durable JSON session log, including changes and their source, to support merge
  and review. A play-history file (JSON, see November 11 above) transfers session data between devices; importing is not itself a
  database sync. Check the club and session, avoid duplicate operations, and retain source evidence.
- Merge non-conflicting changes automatically. The Queue Master reviews conflicting matches, winners,
  timestamps and payment states, choosing the correct record; keep the original records and decision.
  If a disputed match cannot be resolved, the Queue Master may mark that match invalid, without winner
  or ranking credit, and finish the remaining session.
- Before Session done, ask the Queue Master to confirm all devices have synced or been imported. Show
  known device status where available. Devices may be unknown to the server. If device data is missing,
  warn that games and payments may be lost; the Queue Master may explicitly accept that risk and finish
  with the available records. The Queue Master is responsible for accounting for the devices.
- Timestamps can flag suspicious records, but do not prove all records are present. A match has a unique
  internal ID and may have a temporary label offline; its final shared number is assigned on sync.
- Late records after Session done are not merged automatically; a reviewed recovery process remains to
  be specified. The Queue Master may correct payment status after Session done with an audit record;
  payment changes do not reopen or change match results.

## Online boundaries

| Action | Connectivity rule |
|---|---|
| Club sign-in | Online |
| Create or edit a session's setup | Online; the form can be filled offline but not saved |
| Download session for offline operation | Online; a previously exported session can also be imported offline |
| Start a session | Online only |
| Generate/edit waiting matches, start/finish/invalidate games, substitute players, presence, extend time, add/remove free courts | Works on a downloaded session while offline |
| Add a player during an active session | Works offline for downloaded club players and newly entered guests; global ROTRA player search is online only |
| Sync saved work | Automatic when internet returns |
| Session done and final result slides | Online only: needs reconnection, complete sync, and Queue Master review of every unresolved guest ([D-2026-11-07-03](../../../../../mvp/decisions.md#d-2026-11-07-03)) |
| Publish results | Online only |
| Tick players paid / not paid | Works offline; syncs like other changes |
| Club settings (view or change club details, name-change request, password, license) | Online only; offline the page is unavailable |

## Download and sync status

Each device downloads a session for itself: **Not downloaded on this device**, **Downloading…**, or **Ready on this device** (with **Update download**). A download on one device does not prepare another.

Until a data mode has a device-download adapter, an upcoming Queue Session shows **Not connected** for its
offline-copy status. This is not a claim that no download exists; it avoids turning unavailable device-local
evidence into a false “No”.

Real data mode has a durable **read-only** device copy in IndexedDB (#477): a downloaded session stays
viewable offline. Offline writes (the outbox and replay above) are #722. Until #722 lands, real-mode writes
are online only, so nothing is ever "Saved on this device"; the sync status reports the server's check time
and whether a session's records are proven complete.

The top bar always shows sync status:

| Status | Meaning |
|---|---|
| Synced HH:MM | Online; time of the last successful sync |
| Syncing… | Uploading after reconnecting |
| Offline · N waiting to sync | Offline with N changes saved on this device |
| Working offline | Offline with nothing waiting |

Every change made offline is confirmed as "Saved on this device, waiting to sync". When the connection returns, ROTRA syncs automatically and reports how many changes synced. The console shows an offline notice, and Session done stays disabled until the device is online, all available changes have synced, missing-device risk is acknowledged where applicable, and the Queue Master has reviewed every unresolved guest (confirm a match or create a new unclaimed player; never auto-linked by name; see [D-2026-11-07-03](../../../../../mvp/decisions.md#d-2026-11-07-03)).

The primary operating device keeps the session moving offline. Public pages see the last synced information. Profile lookup, permanent RTR identity allocation, and cross-product updates cannot pretend to complete without connectivity.

## Interrupted device and completeness

Follow the [interruption recovery flow](flow/interruption-recovery.md). The Queue Master reviews
collisions and confirms device records before Session done, including accepting the warning when
records cannot be recovered. Timestamps help flag suspicious records but cannot prove completeness.

ROTRA retains original records and decisions for review. A disputed match may be marked invalid; it
has no winner or ranking credit. A completed session does not automatically accept late device data.
The reviewed late-record recovery process remains to be specified.
