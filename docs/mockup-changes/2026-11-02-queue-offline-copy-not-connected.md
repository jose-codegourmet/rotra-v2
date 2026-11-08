# Show unavailable device-download evidence truthfully

Status: IN MOCK APP — #385 (PR #388)
Date: 2026-11-02
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Q-HOME › upcoming Now card
Screen ID: Q-HOME

## What changed

- The offline-copy stat now displays **Not connected** when the current data mode has no device-download adapter, instead of falsely displaying **No**.

## Why

- #385 requires real-mode session counters to reflect saved data or disclose that the data is not connected.

## Docs updated

- Business logic: docs/business_logic/product/queue/modules/offline/README.md — records the unavailable-evidence state.
- Database design: none needed; device downloads have no persisted source in this data mode.
- Screen docs: docs/screens/product/modules/queue/access-home.md — adds the upcoming-card state and copy.

## Real app work

- Queue session reads expose saved match counters and preserve an unavailable device-download value through the shared Now card.
