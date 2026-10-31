# Session financials and club inventory

**Surfaces:** `Q-FINANCIALS`, `Q-INVENTORY`, `Q-INVENTORY-ITEM`.

**Source:** [financials rules](../../../../business_logic/product/queue/modules/financials/README.md). **Reference:** [ROTRA Queue prototype](../../../../../app/mocksups-app/queue-app/rotra-queue.html) — setup step 5 and Inventory.

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

**Where:** the **Payments** tab on the preparation page, the **Payments** tab on the live console, and the bottom of the session record's Financials tab.

- Intro: “₱700 per player (custom amount, includes the ₱60 entrance fee).” or “₱594 per player (break-even share).” or “No fee set for this session.”, then “Tick players as they pay. ROTRA only records it; money is collected outside the app.”
- Tiles: **Paid** “15/18”, **Collected**, **Still due**, **Against costs** (“+₱10” in green or “−₱7,500” in amber, “of ₱11,250 cost”).
- Filter: Everyone · N, Not paid · N, Paid · N. **Mark all paid** while anyone is unpaid.
- A **grid of player cards** (unpaid first; as many columns as fit, at least 150 px each, two on phones): clickable picture and the paid switch on top, then name and “₱250 due” or “✓ Paid ₱250 · 7:42 PM”. Paid cards get an accent border, tint and picture ring. Toasts: “NAME paid ₱250”, “NAME marked not paid”.
- Empty states: “Everyone has paid.” / “Nobody has paid yet.” / “No players yet.” Invalid sessions show no checklist.

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
