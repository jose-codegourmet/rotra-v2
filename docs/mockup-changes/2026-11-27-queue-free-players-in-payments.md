# Queue Payments: a player can play free

Status: IN MOCK APP — PR #1171
Date: 2026-11-27
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `paymentsPanel`, `payAmount` sheet, `duePerHead`, `financeCalc`
Route: live console › Payments; preparation page; session record › Financials
Screen ID: Queue Payments (live, preparation, record)
Artifact: none (owner supplied a screenshot in chat)
Components: payments-panel, payment-card, payment-amount-sheet
Decision: [D-2026-11-27-01](../mvp/decisions/2026-11-27.md#d-2026-11-27-01)
Supersedes: none
Superseded by: none

## What changed
- A roster player can be marked **Free** from their card: tap the card, then the **Plays free** switch in **Payment from <name>**. Switch it off to make them pay again.
- A free player owes ₱0 and leaves the head count of the **break-even share** (total cost ÷ paying players, rounded up). A custom amount per player is unchanged. Costs, including the entrance fee, stay the same.
- The card gets a dashed border, a **Free** chip, "Not counted in the split" and no paid switch.
- A new **Free · N** filter tab appears beside Not paid and Paid (always shown since November 27, 2026; see the [Free tab log](2026-11-27-queue-free-tab-always.md)). Not paid and Paid count paying players only.
- Totals: **Paid** reads X/payers with "N free" under it; **Still due** and **to reimburse** skip free players; **Mark all paid** skips them. The intro line says "N free not counted". The payment status share leaves free players out.
- Setting a player with cash recorded to free clears the amount received; nothing goes to reimburse, since payments are a guide only (owner, November 27, 2026). A slot paid on a transfer can't be set free. Recording cash for a free player makes them a payer again.

## Why
- Owner, November 27, 2026 (screenshot of Payments, 24 players): "make a 'excluded' feature or free so it doesnt count them during the 'fair share' mode". Confirmed: it means the break-even share; the name is **Free**; set from the card, with a filter tab.
- Owner artifact comments, November 27, 2026: "the QM can still revert them back to free", then in chat "I still cant put them to free even if I marked them paid … the payments arent so strict at all … this only serves as a guide only".

## Like for like
- Check the Payments tab at 375 px and 1280 px, dark and light: dashed free card, Free chip, Free · N tab, Paid X/Y.

## Reuse plan
- Extends: the payment card and the payment amount sheet (a new switch row); the filter group (one more tab).
- New: none.

## Docs updated
- Business logic: `docs/business_logic/product/queue/modules/financials/README.md` — Free players.
- Database design: `docs/database_design/product/queue/modules/financials-inventory.md` — `is_free` on the roster entry (proposed).
- Screen docs: none yet; add with the ticket.

## Real app work
- Done November 27, 2026 ([D-2026-11-27-01](../mvp/decisions/2026-11-27.md#d-2026-11-27-01)): PaymentCard (dashed, Free chip, no switch), PaymentsChecklist (Free · N tab, Paid X/payers, "N free"), PaymentAmountForm (Plays free row), PaymentsPanel wiring; mock store, real mode and the offline outbox.
- Roster entry gets a free flag; break-even, status, totals, filters and the share text follow the rules in the business doc, in mock and real modes.
