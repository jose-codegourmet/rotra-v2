# Queue Payments: the Free tab always shows

Status: IN MOCK APP — PR #1169
Date: 2026-11-27
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `paymentsPanel`
Route: live console › Payments; preparation page; session record › Financials
Screen ID: Queue Payments (live, preparation, record)
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Decision: [D-2026-11-27-01](../mvp/decisions/2026-11-27.md#d-2026-11-27-01)
Components: payments-checklist
Supersedes: the "while anyone is free" part of [free players](2026-11-27-queue-free-players-in-payments.md)
Superseded by: none

## What changed
- The **Free · N** filter tab always shows after Paid, **Free · 0** included, so the Queue Master can find the feature before anyone is free.
- Its empty state reads "Nobody plays free. Tap a card, then Plays free."

## Why
- Owner, November 27, 2026 (screenshot of Everyone · 32, Not paid · 32, Paid · 0 in production): "you forgot about the free tab".

## Like for like
- Payments at 375 px and 1280 px, dark and light: four tabs, Free · 0 with nobody free.

## Reuse plan
- Extends: PaymentsChecklist's segmented control. New: none.

## Docs updated
- Business logic: financials README (Free players). Screen: financials-inventory (Plays free). Decision: D-2026-11-27-01. Database: none.

## Real app work
- Done in the same change: `PaymentsChecklist` always lists the Free option.
