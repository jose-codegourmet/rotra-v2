# Session financials and club inventory

**Last verified:** 2026-11-22 (Share status, #1010). 2026-11-01 for the rest.
**Surfaces:** `Q-FINANCIALS`, `Q-INVENTORY`, `Q-INVENTORY-ITEM`.

**Source:** [financials rules](../../../../business_logic/product/queue/modules/financials/README.md). **Reference:** [ROTRA Queue prototype](../../../../../apps/mockup/queue-app/rotra-queue.html) — setup step 5 and Inventory.

## Q-FINANCIALS — Setup step 5

**Entry:** session setup, page 3 of 3 (Costs and review). **Actor:** licensed club operator.

Intro copy: “All optional. These are estimates to help you set a fair fee. ROTRA doesn't collect money. You can tick who has paid on the session's Payments list.”

| Control | Behavior |
|---|---|
| Court fee per hour, per court | ₱ number, 0 or more, may be empty. Prefilled from the chosen venue's saved rate. Hint shows “N courts × duration = ₱total”, then “Filled in from VENUE's saved rate. Changing it here only affects this session.” — or, after a change, “VENUE's saved rate is ₱X.” with **Use it** |
| Entrance fee per head (optional) | ₱ number, 0 or more, may be empty, next to the court fee. Hint “A misc fee some venues charge each player. It's listed in the costs for transparency and covered by the payment per player.” Prefilled from the venue's entrance fee (used first) or the club default, with source hints “Talamban Shuttle Courts' entrance fee. Changing it here only affects this session.” / “Your club's default entrance fee …”, or after a change “… is ₱X.” with **Use it** |
| Payment per player | Below Shuttlecocks. Two-way choice: **Break-even · ₱X** (default) and **Custom amount**. Break-even hint: “The full amount each player pays, worked out for you: total cost (entrance fees included) ÷ N players, rounded up. …” Custom shows a ₱ amount (placeholder = break-even), focused when chosen, with “The full amount each player pays, including the ₱60 entrance fee. Break-even is ₱X. At ₱Y a player: ₱Z profit / ₱Z loss / Breaks even.” |
| Shuttlecocks | One row per brand: brand select (name · ₱cost/unit · N left), tubes number, line cost, remove. **+ Add another brand**, **Manage inventory** |
| Estimate card | “Estimate for N players”: Courts, Shuttlecocks, Entrance fees “₱1,080 · ₱60 × 18 · misc” (when set), **Total cost**, Break-even “₱X a player”, Players pay “₱Y each · custom amount / break-even”, You'd collect “₱Z”, **Result**: “₱N profit” (green), “₱N loss” (amber), “Breaks even · ₱N extra from rounding up”, or “No costs entered” |

- Planning more tubes than in stock shows “Only N tubes in stock.” as a warning, not an error.
- With no shuttlecocks in inventory: “No shuttlecocks in your inventory yet.” with **Add some**.
- Hint: “Rule of thumb: about 1 tube per court every 1.5 hours. Prices come from your inventory.”
- Errors block Next: “Use 0 or more, or leave it empty.” (court fee); “Enter the amount per player, or switch to break-even.”
- **Manage inventory** opens Q-INVENTORY with **Back to session setup**, returning to the same draft and step.

The review step lists **Costs**: “₱total total · players pay ₱Y (custom|break-even) · result”, with Edit. The preparation overview shows “₱total estimated · ₱share a player to break even”, then “Players pay ₱Y (custom amount|break-even) · result”. The session record's Financials tab shows Break-even, Players paid, and Expected “₱collect · result”.

No financial value appears on the public page, result slides, or image exports.

## Q-PAYMENTS — Payments checklist

**Where:** the **Payments** tab on the preparation page, the **Payments** tab on the live console, and the bottom of the session record's Financials tab. Tab selection on the preparation page is in the URL (`?tab=overview|roster|waitlist|payments`), so Back, reload and shared links restore it; a missing or unknown value opens Overview.

- Intro: “₱700 per player (custom amount, includes the ₱60 entrance fee).” or “₱594 per player (break-even share).” or “No fee set for this session.”, then “Tick players as they pay, or tap a card to record a partial amount. ROTRA only records it; money is collected outside the app.”
- Tiles: **Paid** “15/18” (Paid + Reimburse; hint “2 partial” when any), **Collected** (sum received and kept, net of manual refunds; hint “₱100 to reimburse” only when above 0, “₱X refunded” when any refund was recorded, #1014), **Still due** (what the roster still owes at today's amount), **Against costs** (“+₱10” in green or “−₱7,500” in amber, “of ₱11,250 cost”).
- Filter: Everyone · N, Not paid · N (Unpaid and Partial), Paid · N (Paid and Reimburse). **Mark all paid** while anyone has no payment recorded.
- A **grid of player cards** (no payment first; as many columns as fit, at least 150 px each, two on phones): clickable picture (profile) and the paid switch on top, then the card body: name, a status chip and “₱250 due” or “₱250 received · 7:42 PM”. Chips (#479): **Paid** (accent), **Partial · ₱50 left** (warning), **Reimburse · ₱50 to return** (accent), **Unpaid** (muted). Paid and Reimburse cards get an accent border, tint and picture ring; Partial cards a warning border and, when on, a warning-colored (yellow) paid switch instead of the accent one (owner request, November 8, 2026).
- **Owner decision, November 7, 2026 (#479):** the card body (not the switch or picture) is a button that opens the **Payment from <name>** sheet: “Amount due: ₱250” (or “No fee set for this session.”), **Amount received** (₱ field, prefilled with the amount received so far, else the amount due), **Full ₱250** and **Clear** (0) buttons, a live status preview chip, “ROTRA only records it; money is collected outside the app.”, then **Cancel** / **Save**. Save first flushes pending switch changes, then saves the amount; 0 saves as not paid. Toast: “Ana Cruz paid ₱200” or “Ana Cruz marked not paid”. A failed save keeps the sheet and the typed amount with the error above the buttons. Cancelled and invalid sessions stay read-only (“Payments are not available for this session.”). One toast per accepted batch: “N payment marks saved” (singular: “1 payment mark saved”), with the existing “ · Saved on this device, waiting to sync” suffix offline.
- **Owner decision, November 1, 2026 (#300):** switches, totals, filter counts and paid tab counts update immediately; the grid stays interactive during saves. After 800 ms without another switch, send the desired paid state of every changed player in one atomic batch. Switching back to the accepted state before saving drops that player from the batch.
- **Mark all paid** starts a flush of pending switches first, then queues the remaining paid marks behind that save. Tab changes, sheet close and route changes flush on panel exit. Page hide/exit initiates a flush; an outstanding save warns before browser exit. Mock data still resets on reload.
- A failed batch rolls back its switches while preserving later changes, and shows the existing save error and error toast. The summary toast appears only after acceptance.
- Empty states: “Everyone has paid.” / “Nobody has paid yet.” / “No players yet.” Invalid sessions show no checklist.
- **A slot that came by slot transfer** (#1013, [D-2026-11-22-05](../../../../mvp/decisions/2026-11-22.md#d-2026-11-22-05); [log](../../../../mockup-changes/2026-11-22-queue-transfer-accounting.md)): the card is **Paid** with “₱500 received · via transfer” and “₱400 waived” (when anything was waived); its switch is on and disabled (“NAME paid through a slot transfer”). The card body opens **Slot history · NAME** instead of the amount editor: “NAME holds this slot through N approved transfer(s). FIRST is the original payer. Past transfers are never changed.”, a numbered list oldest first (“**A → B**”, “A paid ₱600 · ₱300 waived · approved Sun, Nov 22, 7:40 PM by the Queue Master”, “ · transfer link” when claimed through a link), **Cash collected for this slot**, **Waived** “₱300 · not cash”, **Status** chip, the notice “A waived amount is never collected cash. ROTRA moves no money; it only keeps the record.”, and Close. Mark all paid skips it; a refused change reads “This slot was paid through a slot transfer, so its payment can't be changed here.” The **Collected** tile adds the hint “₱X waived (not cash)” when anything is waived; Collected itself is cash only. The share text lists the person under Paid with “· ₱400 waived”.
- **Plays free** ([D-2026-11-27-01](../../../../mvp/decisions/2026-11-27.md#d-2026-11-27-01); [log](../../../../mockup-changes/2026-11-27-queue-free-players-in-payments.md)): the **Payment from <name>** sheet has a **Plays free** switch row (“Owes nothing and is not counted when the break-even share is worked out.”, plus “ Turning this on clears the amount received.” when cash is recorded). Toasts: “NAME plays free”, “NAME pays again”. A free card is dashed with a **Free** chip, “Not counted in the split” and no paid switch; free cards sort last. A **Free · N** tab always follows Paid (Free · 0 included; empty: “Nobody plays free. Tap a card, then Plays free.”); Not paid and Paid count paying players. The **Paid** tile reads X/payers with “N free”; the intro adds “, N free not counted”. Mark all paid and the share text skip free players. A slot paid on a transfer has no Plays free row (“This slot was paid on a transfer, so it can’t be set free.”).
- **Share status** (#1010; [log](../../../../mockup-changes/2026-11-22-queue-payment-status-share.md)): a small button beside **Mark all paid** while the roster is not empty. It opens the **Share payment status** dialog: a filter row **All · N**, **Paid · N**, **Partial · N**, **Unpaid · N**; a read-only monospace text preview (header “Payment status · TITLE · Thu, Nov 20”, “₱700 per player”, then “PAID (2)”, “PARTIAL (1)”, “UNPAID (1)” lists numbered from 1 with paid amount and balance, and “Collected: ₱X · Balance: ₱Y”); the note “Collected is the cash received. ROTRA only writes the text; money is collected outside the app.”; footer **Close**, **Share** (only where the device has a share sheet), **Copy text**. Toasts: “Payment status copied”, “Couldn't copy. Try again.” Rules: [financials](../../../../business_logic/product/queue/modules/financials/README.md#share-payment-status-1010-epic-1009-owner-decisions-november-22-2026-d-2026-11-22-02).

## Q-INVENTORY — Club inventory

**Entry:** home sidebar **Inventory** (with item count), or **Manage inventory** from setup. Blocked by the license gate when expired.

Header: “Inventory”, “N items · stock worth ₱X”, primary **Add item**. Sections: Shuttlecocks, Equipment, Other; an empty section reads “No equipment yet.”

Item card:

- Name and a remove (×) button. Removing is immediate and confirmed by a toast.
- “₱cost per unit” or “No cost”.
- − / count / + steppers (− disabled at 0), with “units in stock”.
- **Running low** in warning color when 2 or fewer remain; the card is highlighted.
- **Edit**.

Footer copy: “Shuttlecock prices here fill in the session cost estimate. Stock isn't deducted automatically yet; adjust it with − and + after a session.”

## Q-INVENTORY-ITEM — Add or edit item

Sheet titled **Add item** or **Edit item**.

| Field | Rule |
|---|---|
| Name | Required: “Give the item a name.” |
| Category | Segmented: Shuttlecocks, Equipment, Other; new items default to Shuttlecocks |
| Unit | Text; placeholder “tube, piece, case”; blank saves as “piece” |
| In stock | Whole number, 0 or more; blank saves as 0 |
| Cost per unit (₱) | Whole number, 0 or more; blank saves as 0 |

Primary **Add item** / **Save item**; Cancel discards. Success toast: “NAME added to inventory” or “Item saved”.

## Acceptance examples

- A session saved with no financial fields shows no Costs line anywhere.
- Changing a shuttle brand's cost in inventory changes the estimate the next time setup or preparation is opened.
- Using shuttles in a session leaves inventory stock unchanged until the operator adjusts it.
- An expired club opening Inventory sees the license gate.
