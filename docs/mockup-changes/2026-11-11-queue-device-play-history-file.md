# Club settings › This device: Export play history and Import play history…

Status: NEW
Date: 2026-11-11
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Club settings › This device
Route: /queue/club?tab=device
Screen ID: Q-CLUB (This device section)
Artifact: none
Components: device-downloads-card, button, toaster
Supersedes: none
Superseded by: none

## What changed
- Before: the section listed the sessions downloaded on this device and said downloads are per device.
- After: under the list there is a row with **Export play history** (secondary) and **Import play history…** (secondary, opens the file picker, `.json`), with the helper text “Changes made offline are saved on this device automatically. The file is a backup for moving a session to another device or recovering one that broke.” Export downloads `playhistory.json`; toast “Play history exported”. Import reads the file and toasts “Play history imported · N changes waiting to sync” (or “That file isn't a ROTRA play history.” on a bad file). Export is disabled when nothing is downloaded. Both work offline (the section is the one part of Club settings that does).

## Why
- Owner answer of November 11, 2026 ([D-2026-11-11-04](../mvp/decisions.md#d-2026-11-11-04)): offline changes are saved automatically on the device; the file and its Import button are “for brute force sake (for non technical people)”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: no downloads (Export disabled, Import enabled), downloads present, after export (toast), after import (toast with count), bad file (error toast), offline (section still shown; the rest of Club settings keeps its offline notice).
- Copy: **Export play history**, **Import play history…**, **Changes made offline are saved on this device automatically. The file is a backup for moving a session to another device or recovering one that broke.**, **Play history exported**, **Play history imported · N changes waiting to sync**, **That file isn't a ROTRA play history.**
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: button (secondary sm), toaster
- Extends: the This device card in Club settings (two buttons and helper text)
- New: none in `@rotra/ui`; `@rotra/data` export/import of the device copy and outbox
- Shares work with: #722 (the outbox the file carries)

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/offline/README.md (owner decisions of November 11, 2026; Download and sync status)
- Database design: none (the file is device-local; importing is not a database sync)
- Screen docs: docs/screens/product/modules/queue/access-home.md (This device row)

## Real app work
- Part of #722: outbox in IndexedDB, export/import of `{ session, deviceCopy, outbox }` as `playhistory.json`, replay on reconnect.
