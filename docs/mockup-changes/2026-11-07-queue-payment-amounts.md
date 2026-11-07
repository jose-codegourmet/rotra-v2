# Payments: record full or partial amounts and flag reimbursements

Status: ALREADY A TICKET — #479
Date: 2026-11-07
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › paymentsPanel (preparation Payments tab, console Payments sheet, session record Financials) · SHEETS.payAmount
Screen ID: Q-PAYMENTS

## What changed
- Payment cards: the quick paid switch stays. The card body (name, status, amount) is now a button that opens **Payment from <name>**; the picture still opens the profile.
- Each card shows a status chip: **Paid**, **Partial · ₱X left**, **Reimburse · ₱X to return** or **Unpaid**, and “₱X received · time” or “₱X due”. Partial cards get a warning border; Paid and Reimburse keep the paid look.
- New sheet **Payment from <name>**: amount due, **Amount received** (prefilled with what was received, else the amount due), **Full ₱X** and **Clear**, a live status preview, “ROTRA only records it; money is collected outside the app.”, Cancel / Save. Opened from the console Payments sheet, Cancel and Save return to it.
- Totals: Paid counts Paid + Reimburse with “N partial”; Collected sums amounts received with “₱X to reimburse” when above 0; Still due sums what each player still owes at today's amount. Filters: Not paid = Unpaid + Partial, Paid = Paid + Reimburse. Mark all paid shows while anyone has no payment recorded.
- Intro copy: “Tick players as they pay, or tap a card to record a partial amount. ROTRA only records it; money is collected outside the app.”

## Why
- Owner request and decisions, November 7, 2026 (#479): keep the toggle, record actual amounts received, and when the per-player cost changes show who paid more (Reimburse) or less (Partial). Amounts received are never rewritten by pricing changes; Reimburse is a label only.

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/financials/README.md — Payments checklist owner decision, statuses, totals, boundaries
- Database design: docs/database_design/product/queue/modules/financials-inventory.md and physical-schema.md — `session_payment_marks.amount_minor` now means amount received; derived status and totals
- Screen docs: docs/screens/product/modules/queue/financials-inventory.md — Q-PAYMENTS cards, chips, tiles, filters and the Payment from <name> sheet

## Real app work
- Done in #479: `PaymentCard` body button + `PaymentStatusChip`, `PaymentAmountForm` (sheet body), `PaymentsChecklist` totals/filters, `PaymentsPanel` sheet wiring; pure rules in `@rotra/data/session-payment/rules`; `POST /api/sessions/[sessionId]/payments/amount` over `setPaymentAmount` in `@rotra/db/queue/financials`.
