# Queue: slot transfer accounting, the automatic waiver shown before Approve and the slot history

Status: IN MOCK APP — #1013
Date: 2026-11-22
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Requests (`requestsPanel`) › Slot transfers (`transferRow`, `approveTransfer`); Payments (`paymentsPanel`, `payStatus`, new `slotPay` / `transferPay` helpers, `togglePaid`, `payAmount`, `markAllPaid`); new sheet `slotHistory`; Share payment status (`payShareGroups`, `payShareText`); every other paid reader (roster card, roster Payment filter, preparation tab count, cancelled record, Cancel session sheet)
Route: /queue/sessions/<id>/preparation (Requests card, Payments tab), /queue/sessions/<id> (live console Payments), session record › Financials. Prototype demo: /queue/sessions/s-tonight/preparation (Dani's pending transfer shows "₱500 paid · ₱400 will be waived."; Paulo Garcia's Payments card is a slot that came by transfer)
Screen ID: Q-PREPARE (Requests), Q-PAYMENTS
Artifact: none
Components: slot-transfer-history (new), slot-transfer-row (extended with `payment`), payments-checklist/payment-card (extended with `transfer`, `onOpenHistory`), payments-checklist (extended with `totals.waived`, `onOpenSlotHistory`)
Supersedes: none
Superseded by: none

## What changed
- **Requests › Slot transfers** rows add a payment line before Approve: "**Payment:** ₱500 paid · ₱400 will be waived. NAME will be Paid in Full and owe ₱0. Collected cash stays the same." A fully paid slot reads "₱900 paid · fully paid, nothing to waive."; no fee set reads "No fee set: nothing to waive."
- **Approve** records that payment on the transfer (amount due, cash collected for the slot, earlier waivers, the new waiver) and writes or changes no payment. Toast: "SENDER's slot now belongs to RECIPIENT · ₱400 waived" (no suffix when nothing is waived).
- **Payments**: the recipient's card is **Paid** with "₱500 received · via transfer" and "₱400 waived". Its paid switch is on and disabled; tapping the card body opens **Slot history** instead of the amount editor. Quick ticks, the amount editor and **Mark all paid** never add a second payment for it ("This slot was paid through a slot transfer, so its payment can't be changed here.").
- **Collected** counts cash only: the sender's cash is carried to the slot's holder and counted once; the tile adds "₱400 waived (not cash)" when anything is waived. **Still due** subtracts waivers; **to reimburse** counts only cash above the amount due.
- **Slot history · NAME** (sheet): "NAME holds this slot through N approved transfer(s). FIRST is the original payer. Past transfers are never changed.", then one numbered line per approval, oldest first: "**A → B**", "A paid ₱600 · ₱300 waived · approved TIME by the Queue Master" (" · transfer link" when claimed through a link); then **Cash collected for this slot**, **Waived** "₱300 · not cash", **Status** chip; the notice "A waived amount is never collected cash. ROTRA moves no money; it only keeps the record."; **Close**.
- **Share payment status** lists the holder under Paid with "paid ₱500 · balance ₱0 · ₱400 waived"; "Collected" stays cash only.
- Every other "paid" reader (roster card, Payment filter, tab count, cancelled record, Cancel session sheet) reads the same slot payment, so a transferred slot reads Paid everywhere.
- Seed: Dani paid ₱500 of tonight's ₱900; Nico paid ₱600 and gave his slot to Paulo yesterday (₱300 waived).

## Why
- Epic #1009 / ticket #1013; owner decisions on #1015, November 22, 2026 (confirmed decisions: fully or partially paid slots can transfer; on approval the recipient is Paid in Full and owes ₱0; any remaining balance is automatically waived and the waiver amount is shown before approval; actual collected money stays unchanged; transfers may repeat with a full immutable chain of original payer, recipient, payment, waiver, approvals and dates; no duplicate payment or capacity). An unpaid slot follows the same rule (the whole amount due is waived): an assumption recorded in D-2026-11-22-05.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: a transfer row with a partial, a full and an unpaid slot, and with no fee set; the recipient's Payments card (with and without a waiver); the Collected tile with the waived hint; Slot history with one and with two transfers; the share text with a waived line.
- Copy: every string listed above.
- Tokens: none new.
- Known differences: the mockup keys payments by player and keeps the sender's payment in place; the real app keeps the sender's mark on their released roster entry and a database trigger refuses any later change to it. The prototype's approver line always says "the Queue Master" (the club account); the real app records the deciding device when there is one, and the history shows the same words.

## Reuse plan
- Reuses as is: Sheet, Notice, PaymentStatusChip, Switch
- Extends: SlotTransferRow (`payment`), PaymentCard (`transfer`, `onOpenHistory`), PaymentsChecklist (`totals.waived`, `onOpenSlotHistory`)
- New: SlotTransferHistory

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md (Slot transfers › Money), docs/business_logic/product/queue/modules/financials/README.md (Payments checklist, Share payment status)
- Database design: docs/database_design/product/queue/modules/sessions-roster.md (`session_slot_transfers` payment snapshot, CHECKs), docs/database_design/product/queue/modules/financials-inventory.md (marks frozen by a transfer, totals)
- Screen docs: docs/screens/product/modules/queue/financials-inventory.md, docs/screens/product/modules/queue/session-setup.md
- Product terms: Waiver, Slot history
- Decision: D-2026-11-22-05

## Real app work
- Done in the same commit: pure rules `@rotra/data/slot-transfer/transferAccounting.rules` (waiver, snapshot, chain, frozen mark, history steps; unit tested) and `slotPayments` over the mock store; `paymentStatus` / `paymentTotals` / the share rule take waivers; the mock Payments read, public payment status, Requests read (waiver preview) and approval; `SlotTransferHistory`, `SlotTransferRow`, `PaymentCard` and `PaymentsChecklist`; `PaymentsPanel` and `JoinRequests` wiring; real mode in `packages/db/src/queue/transfer-accounting.ts`, `financials.ts` and `slot-transfers.ts` and the approve Route Handler (`expectedWaiverMinor`); migration `20261122000600_slot_transfer_accounting` (applied to a local disposable database only).
- Not built here: refunds and FIFO release (#1014), leaving a club (#1018).
