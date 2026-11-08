# Offline operation and recovery

**Status:** Confirmed v1 target rules. This is a core requirement, not an optional later enhancement. Updated October 26, 2026 to match the [ROTRA Queue prototype](../../../../../../apps/mockup/queue-app/rotra-queue.html); online boundaries updated November 7, 2026 for MVP by [D-2026-11-07-03](../../../../../mvp/decisions.md#d-2026-11-07-03).

## Online boundaries

| Action | Connectivity rule |
|---|---|
| Club sign-in | Online |
| Create or edit a session's setup | Online; the form can be filled offline but not saved |
| Download session for offline operation | Online |
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

Real data mode (#399) has no device-download adapter yet: device enrollment waits on
[#246](https://github.com/jose-codegourmet/rotra-v2/issues/246) and durable browser storage on Q11. Real
mode is online only, so nothing is ever "Saved on this device"; the sync status reports the server's
check time and whether a session's records are proven complete.

The top bar always shows sync status:

| Status | Meaning |
|---|---|
| Synced HH:MM | Online; time of the last successful sync |
| Syncing… | Uploading after reconnecting |
| Offline · N waiting to sync | Offline with N changes saved on this device |
| Working offline | Offline with nothing waiting |

Every change made offline is confirmed as "Saved on this device, waiting to sync". When the connection returns, ROTRA syncs automatically and reports how many changes synced. The console shows an offline notice, and Session done stays disabled until the device is online, every change has synced, and the Queue Master has reviewed every unresolved guest (confirm a match or create a new unclaimed player; never auto-linked by name; see [D-2026-11-07-03](../../../../../mvp/decisions.md#d-2026-11-07-03)).

The primary operating device keeps the session moving offline. Public pages see the last synced information. Profile lookup, permanent RTR identity allocation, and cross-product updates cannot pretend to complete without connectivity.

## Interrupted device

Device 1 may lose battery while holding unsynced results. Device 2 is allowed to continue the same session and record new matches even though it does not yet know all device 1's work.

At finalization, missing/inconsistent records prompt sync and **“Was the session interrupted?”**

- **Yes:** device 1 must reconnect and supply its records. The operator reviews conflicts and clarifies match winners before finalization.
- **No:** the inconsistent session is invalid; no player-performance contribution and no leaderboards/result slides.
- **Original records permanently unavailable:** the session remains invalid. Manual reconstruction is not allowed.

An invalid session contributes no official player match history, games played, wins, losses, or performance. Retention of non-counting diagnostic records is not yet specified.

Device 2 cannot finalize while required device 1 data is missing. A low game count alone does not justify this check: the operator may legitimately finish below the target or admit players late.

## Integrity requirements and limits

Sync must not double-count a match or apply the same session to player performance twice. Conflicting device records must not silently overwrite each other. These are business outcomes; the specific offline storage, device ownership, merge protocol, and detection mechanism have not been chosen.

The operator's conflict review must coexist with immutable confirmed results. Exactly how to handle two incompatible confirmed outcomes remains an implementation-blocking open decision, not a general permission to change winners.

No manual rescue is permitted when the original unsynced records are permanently lost. Whether an invalid session can later be recovered if the original device eventually returns is still open.

See [recovery flow](flow/interruption-recovery.md) and [open decisions](../../../open-decisions.md).
