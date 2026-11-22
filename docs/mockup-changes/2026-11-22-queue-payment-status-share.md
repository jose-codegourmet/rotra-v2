# Queue: Share payment status, numbered Paid, Partial and Unpaid text, in Payments and on the public page

Status: IN MOCK APP — #1010
Date: 2026-11-22
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › paymentsPanel › Share status; public session page › Details › Payment status card; sheet `payShare` (Share payment status)
Route: /queue/sessions/<id>/console (Payments), /queue/sessions/<id>/preparation?tab=payments, /s/<slug> (Details tab)
Screen ID: Q-PAYMENTS, Q-PUBLIC-DETAILS
Artifact: none
Components: payment-status-share-sheet (new), payments-checklist (extended with `onShareStatus`), sheet, segmented-control
Supersedes: none
Superseded by: none

## What changed
- Payments checklist: a **Share status** button beside **Mark all paid** opens **Share payment status**.
- The dialog has a filter row **All · N / Paid · N / Partial · N / Unpaid · N**, a read-only text preview, and the footer **Close**, **Share** (only where the device can share) and **Copy text**.
- The text: "Payment status · TITLE · DATE", "₱700 per player", then "PAID (n)", "PARTIAL (n)", "UNPAID (n)" lists numbered from 1. Paid and Partial lines show the amount paid and the balance; Unpaid lines show the balance; an overpaid person is listed under Paid with "₱X to return". The last line is "Collected: ₱X · Balance: ₱Y" for the people shown.
- Collected is cash received only. A waived amount (slot transfers, #1013) lowers the balance and is never collected; the mockup has no waivers yet.
- Confirmed players and guests only; waitlisted people are not in the text.
- Public session page, Details tab: a **Payment status** card with **Share payment status** (same dialog, names masked like the rest of that page). Shown when the session has an amount due and a roster; not when cancelled.
- The Facebook session share is untouched.

## Why
- Epic #1009 / ticket #1010; owner decision on #1015, November 22, 2026: the share is available in both the authenticated Queue app and the public session page.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: all filters; an empty list ("None"); no fee set (no balances); copy success and failure toasts.
- Copy: "Share status", "Share payment status", "Copy text", "Payment status copied", "Couldn't copy. Try again."
- Tokens: none new.
- Known differences: the mockup prints whole pesos; the real app uses the shared `formatPeso`.

## Reuse plan
- Reuses as is: Sheet, SegmentedControl, Button, the session-payment rules (`paymentStatus`)
- Extends: PaymentsChecklist (optional `onShareStatus`)
- New: PaymentStatusShareSheet

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/financials/README.md (Share payment status)
- Database design: none (no table or column changed; status and amounts are derived from the existing payment marks)
- Screen docs: docs/screens/product/modules/queue/financials-inventory.md, docs/screens/product/modules/queue/public-session.md
- Product terms: Payment status share
- Decision: D-2026-11-22-02

## Real app work
- Done in the same commit: `paymentShare.rules.ts` (+ unit tests), `PaymentStatusShareSheet`, `PaymentsPanel`, `PublicSession` and `usePublicPaymentStatus`. The public page works in real mode through `readPublicPaymentStatus` and `GET /api/public-sessions/[slug]/payment-status` (masked names, roster only, amounts only).
