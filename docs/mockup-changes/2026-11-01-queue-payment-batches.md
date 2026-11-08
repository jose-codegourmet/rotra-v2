# Debounce payment switches and summarize each batch

Status: IN MOCK APP — #300 (PR #372)
Date: 2026-11-01
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Payments
Screen ID: Q-PAYMENTS

## What changed
- Switches update immediately, with one save after 800 ms without another switch.
- Returning to the accepted state cancels that player's pending change.
- Flush on Mark all paid, tab/page navigation, sheet close and page exit.
- Show “N payment marks saved” (singular “1 payment mark saved”) once per accepted batch; keep the offline suffix.

## Why
- Issue #300 and the owner's November 1 decision: 800 ms and one summary toast per batch.

## Docs updated
- Business logic: financials/README.md — batching and rollback behavior.
- Database design: none needed; mark storage and recorded amounts are unchanged.
- Screen docs: financials-inventory.md and state-matrix.md — optimistic counts, flushes, failures and summary copy.

## Real app work
- Implemented under the existing #300 ticket using the shared debounced batch helper and PaymentsPanel.
