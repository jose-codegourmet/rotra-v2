# Session financials and club inventory

**Status:** Agreed v1 target rules, added October 26, 2026 from the [ROTRA Queue prototype](../../../../../frames/queue-app/rotra-queue.html). This replaces the earlier v1 exclusion of shuttle pricing, cost estimates, and paid/unpaid tracking. ROTRA still never collects or moves money.

## Purpose

Help the operator set a fair session fee before the night and keep track of who has paid. ROTRA estimates what the session costs to run and records a paid / not-paid tick per player. It does **not** collect money, issue receipts, split bills between named players, or connect to a payment gateway. Fees are still collected outside ROTRA.

## Session cost estimate

Every field is optional. A session can be created and run with no financial information.

| Input | Rule |
|---|---|
| Court fee | Amount per hour, per court. Prefilled from the chosen venue's saved rate, and still editable for this session; editing it here doesn't change the venue's saved rate. Empty means not set; otherwise 0 or more |
| Entrance fee per head | Optional **misc cost** some venues charge each player. Prefilled from the chosen venue (used first) or the club's **default entrance fee** in Club settings; still editable per session. Listed in the costs for transparency; it is **not** what players pay (decided October 26, 2026) |
| Payment per player | The **full amount** each player pays. **Break-even** (default), worked out automatically from the costs (entrance fees included) and player count, or **Custom amount**: a set amount per head, 0 or more, required when chosen. Every new session starts at break-even |
| Shuttlecocks | Zero or more lines, each one shuttlecock item from the club inventory plus a planned quantity of tubes |

Calculation:

- **Court cost** = court fee × number of courts × session length in hours.
- **Shuttle cost** = sum of (planned tubes × that item's inventory cost per unit). Lines with no item or zero tubes are dropped on save.
- **Entrance fees** = entrance fee per head × player count (misc).
- **Total cost** = court cost + shuttle cost + entrance fees.
- **Per player to break even** = total cost ÷ player count, rounded **up** to a whole amount. Player count is the roster size, or the expected-player count before anyone is on the roster (minimum 1).
- **Players pay** = the break-even share, or the custom amount.
- **You'd collect** = players pay × player count.
- **Result** = collected − total cost, shown as **₱X profit**, **₱X loss**, or **Breaks even**. On break-even the small surplus from rounding up is shown as “Breaks even · ₱X extra from rounding up”. With no costs entered: “No costs entered”. This is how the club tells whether a custom amount gains or loses money.

The default shuttle plan for a new session suggests the first shuttlecock item in inventory, at roughly **one tube per court every 1.5 hours** (rounded, at least 1). This is a rule of thumb shown to the operator, not a requirement.

The custom-amount field placeholder shows the break-even amount, and planning more tubes than are in stock shows a warning ("Only N tubes in stock") without blocking the save.

Money is shown in Philippine pesos (₱) as whole amounts. Other currencies are not specified for v1.

## Payments checklist

Each session has a **Payments** list of its roster players (waitlisted players aren't on it).

- **Amount due per player:** the full payment per head: the session's custom amount when one is set, otherwise the break-even share. Never the entrance fee alone; the intro notes when the amount includes it. With no estimate saved, there is no amount ("No fee set").
- The operator ticks a player as **paid** (one switch per player) or uses **Mark all paid**; unticking marks them not paid again. Each tick records the time and the amount due then.
- Totals: paid count (e.g. 15/18), **collected**, **still due** (unpaid players × amount), and collected **against costs** (over or short of the estimated total cost).
- Filter: Everyone, Not paid, Paid. Unpaid players are listed first.
- It is available before, during and after the session: on the preparation page, from **Payments** in the live console, and in the session record's Financials tab. Ticks are ordinary changes that work offline and sync.

This is a record kept by the operator, not proof of payment. ROTRA doesn't show players' contact details here; private phone and email rules still apply.

## Club inventory

The club keeps one inventory list shared by all its sessions.

| Field | Rule |
|---|---|
| Name | Required |
| Category | Shuttlecocks, Equipment, or Other |
| Unit | Free text such as tube, piece, case; defaults to "piece" when blank |
| In stock | Whole number, 0 or more |
| Cost per unit | Whole amount, 0 or more; 0 shows as "No cost" |

- The operator can add, edit, and remove items, and step stock up or down by one.
- An item with **2 or fewer** in stock shows **Running low**.
- The inventory screen shows the total stock value (sum of stock × cost per unit).
- Only **Shuttlecocks** items can be chosen in a session's shuttle plan. Their cost per unit fills the estimate.
- Stock is **not deducted automatically** when a session uses shuttles. The operator adjusts stock by hand after a session. Automatic deduction is a possible later feature, not v1 behavior.

Inventory is club data behind the license gate: an expired club cannot open it.

## Where it appears

- Session setup page 3 (**Costs and review**) holds the Financials section above Notes and review. The review step summarizes total cost, what players pay (custom or break-even), and the result.
- The preparation overview shows the estimate when one was saved.
- Setup links to the inventory and back, keeping the unsaved setup draft.
- Financial values are **not** shown on the public session page, result slides, or exports.

## Boundaries

- No payment collection, receipts, refunds, per-player bills, or gateways. Paid / not-paid is a manual tick only.
- No per-player charges or different fees per player.
- The estimate does not change minimum-game targets, matchmaking, or results.
- Club license payments remain a separate, manual process in [Admin](../../../admin/modules/clubs-licenses/README.md).

See [estimate flow](flow/estimate-session-costs.md).
