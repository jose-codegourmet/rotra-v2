# Queue: Reject and refund on a slot transfer, FIFO waitlist promotion, and Refund everyone who paid after a cancellation

Status: IN MOCK APP — #1014
Date: 2026-11-22
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Requests (`requestsPanel`) › Slot transfers (`transferRow`, new `openRejectRefund` / `confirmRejectRefund`); new sheets `rejectRefund` and `sessionRefund`; Payments (`slotPay` nets refunds, new `refundOf` / `slotCash` / `firstWaiter` helpers, `paymentsPanel` Collected tile); Cancel session sheet (`cancelSession`); cancelled record (`cancelledRecord`, new `refundRows` / `refundCard`, `openSessionRefund` / `confirmSessionRefund`)
Route: /queue/sessions/<id>/preparation (Requests card), session record of a cancelled session. Prototype demo: /queue/sessions/x-next-full/preparation (Ana Cruz paid ₱200 and asks to transfer her slot; Reject and refund hands her ₱200 back and gives the slot to the first waitlisted player) and the cancelled "Morning Doubles" record (one paid, one partial)
Screen ID: Q-PREPARE (Requests), Q-HISTORY (cancelled form), Q-PAYMENTS
Artifact: none
Components: refund-confirm-sheet (new), refund-list (new), slot-transfer-row (extended with `onRejectAndRefund`), payments-checklist (extended with `totals.refunded`), cancel-session-sheet (copy), session-record-header (copy)
Supersedes: none
Superseded by: none

## What changed
- **Requests › Slot transfers**: when cash was collected for the slot, the row adds **Reject and refund** between Reject and Approve. Plain **Reject** is unchanged: the sender keeps the registration and the payment, and the slot is not released.
- **Reject and refund?** (D-REJECT-REFUND): "NAME asked to transfer their slot to RECIPIENT." A card **Refund to hand back** with the amount, "The whole amount collected for this slot (the ₱X waived is not cash and is not refunded). Full refunds only."; "Hand ₱X back to NAME outside ROTRA. ROTRA only records the refund; it moves no money."; "NAME's registration is cancelled and the slot opens. WAITER, first on the waitlist, gets it." (or "Nobody is waiting, so the slot stays open.") "RECIPIENT doesn't get the slot. The payment and the refund both stay in the record."; danger notice "This can't be undone."; **Back** (focused) and **Reject and refund** (danger).
- On confirm: the transfer is rejected, one refund is recorded for the slot's whole cash, the payment stays as recorded, the sender comes off the roster, their open drop-out notice closes, and while a slot is open the first waitlisted player with a level takes it (FIFO). Toast: "Transfer rejected · ₱200 refund recorded for NAME · WAITER got the slot from the waitlist" (or "· the slot is open").
- **Cancel session** sheet: the paid warning reads "P players are marked paid. After you cancel, the session record lists who to refund and how much. Refund them outside ROTRA, then record each refund."
- **Cancelled record**: the notice reads "… P players were marked paid: refund them outside ROTRA and record each refund below." A new card **Refund everyone who paid** sits after Open public page: "ROTRA doesn't move money. Hand each amount back outside ROTRA, then record it here. Full refunds of the cash collected; waived amounts are not cash."; on the right "₱X to refund · N" (or "All refunds recorded") and "₱Y refunded"; one row per paid or partially paid player: avatar, name, "Paid · ₱250 collected" / "Partial · ₱120 collected", and **Record refund · ₱250** (disabled offline) or the chip "Refunded ₱250 · WHEN".
- **Record refund?** (D-SESSION-REFUND): "NAME · ₱250", "Hand ₱250 back to NAME outside ROTRA, then record it here. ROTRA only records the refund; it moves no money.", "Full refund of the cash collected. The payment and the refund both stay in the record."; **Back** and **Record refund**. Toast "Refund recorded · ₱250 to NAME". One refund per player: a recorded row has no button.
- The cancelled record's roster card reads "Paid ₱250 · refunded" once refunded.
- **Payments › Collected** is the cash kept (received − refunded) and adds "₱X refunded" when anything was refunded. Every other reader (share, public share, Approve's snapshot) counts the cash kept.
- Seed: Club Doubles Night (full, four waitlisted) gets Ana's pending transfer (she paid ₱200); the cancelled Morning Doubles gets a ₱120 partial payer.

## Why
- Epic #1009 / ticket #1014; owner decisions on #1015, November 22, 2026: rejection alone keeps the registration and payment; rejection plus a full manual refund records the refund (no gateway), releases the slot and promotes the next FIFO waitlisted player; full refunds only; the original payment and refund stay in the audit. Whole-session cancellation: the Queue Master is told to refund everyone who paid, sees paid and partially paid players with the amount each, refunds outside ROTRA and records each manual refund. Decision D-2026-11-22-06.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: a transfer row with and without cash collected (no Reject and refund when nothing was paid); the Reject and refund sheet with a waiter and with nobody waiting, and for a carried slot with a waiver; the refund card with rows left, all recorded, and offline; the Record refund sheet; the cancelled roster card after a refund; the Collected tile with the refunded hint.
- Copy: every string listed above.
- Tokens: none new.
- Known differences: the mockup keys payments and refunds by player; the real app keys them on the roster entry, keeps the sender's entry released (reason `refunded`) and a database trigger refuses any change to a refunded payment. The waitlist order the dialog previews is the client's; the server promotes in its own waitlist order (demoted players first, #245) and the toast names who actually got the slot.

## Reuse plan
- Reuses as is: ConfirmSheet, Card, Chip, Avatar, Button, Notice
- Extends: SlotTransferRow (`onRejectAndRefund`), PaymentsChecklist (`totals.refunded`)
- New: RefundConfirmSheet, RefundList

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md (Slot transfers › Reject and refund), docs/business_logic/product/queue/modules/financials/README.md (Manual full refunds)
- Database design: docs/database_design/product/queue/modules/financials-inventory.md (`session_payment_refunds`), docs/database_design/product/queue/modules/sessions-roster.md (`release_reason` `refunded`)
- Screen docs: docs/screens/product/modules/queue/session-setup.md, docs/screens/product/modules/queue/results-sharing.md, docs/screens/product/modules/queue/financials-inventory.md, docs/screens/product/dialogs.md (D-REJECT-REFUND, D-SESSION-REFUND, D-CANCEL-SESSION)
- Product terms: Refund
- Decision: D-2026-11-22-06

## Real app work
- Done in the same commit: pure rules `@rotra/data/session-payment/refund-rules` (net kept cash, full refund amount, the refund list, FIFO pick; unit tested) and refunds in `entrySlotPayment` / `paymentTotals`; mock `rejectAndRefundSlotTransfer` and `recordSessionRefund` with hooks; `RefundConfirmSheet`, `RefundList`, `SlotTransferRow`, `PaymentsChecklist`; `JoinRequests` and `CancelledSessionRecord` wiring; real mode in `packages/db/src/queue/slot-transfers.ts` (`rejectAndRefundSlotTransfer`), `financials.ts` (`recordSessionRefund`, refunds on the Payments read) and `transfer-accounting.ts`, Route Handlers `POST /api/sessions/[sessionId]/requests/transfers/[transferId]/refund` and `POST /api/sessions/[sessionId]/payments/refunds`; migration `20261122000700_session_payment_refunds` (applied to a local disposable database only).
- Not built here: leaving a club (#1018).
