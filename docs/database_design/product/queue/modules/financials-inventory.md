# Session cost estimates and club inventory

**Last verified:** 2026-10-28 for calculation units; payment lifecycle remains proposed.

**Status:** Proposed data model, added October 26, 2026 for the [financials rules](../../../../business_logic/product/queue/modules/financials/README.md) introduced by the [ROTRA Queue prototype](../../../../frames/queue-app/rotra-queue.html). Field names are new design names, not existing Prisma columns.

These records support an estimate and a manual paid / not-paid checklist. There is deliberately no receipt, gateway, or per-player charge table, and no money moves through ROTRA.

## `inventory_items`

| Field | Type / rule |
|---|---|
| `id` | UUID PK |
| `club_id` | UUID FK to clubs; required |
| `name` | Required text |
| `category` | `shuttlecocks`, `equipment`, `other` |
| `unit` | Text, default `piece` |
| `stock` | Integer, `CHECK (stock >= 0)` |
| `unit_cost_minor` | Integer minor units (centavos), `CHECK (unit_cost_minor >= 0)`; 0 means no cost |
| `currency` | ISO 4217 code; `PHP` in v1 |
| `removed_at` | Nullable; set when the operator removes the item |
| `created_at`, `updated_at`, `revision` | Common metadata |

Unique `(club_id, id)` for scoped FKs. Index `(club_id, category, name)` for the inventory screen; active items are those with `removed_at IS NULL`.

Removing an item is a soft remove because past session estimates may reference it. Stock changes are direct updates guarded by `revision`; stock is **not** decremented by session activity in v1. If stock history is wanted later, add an append-only adjustment table rather than overloading this row.

"Running low" (stock ≤ 2) and total stock value (Σ stock × unit cost) are derived at read time, not stored.

## `session_cost_estimates`

One optional row per session.

| Field | Type / rule |
|---|---|
| `session_id` | PK; scoped FK `(club_id, session_id)` to `queue_sessions` |
| `club_id` | UUID |
| `court_fee_per_court_hour_minor` | Nullable integer ≥ 0; null means not set |
| `entrance_fee_per_head_minor` | Nullable integer ≥ 0; misc per-head cost, included in the total; null means none |
| `payment_mode` | `break_even` (default) or `custom` |
| `custom_fee_per_head_minor` | Nullable integer ≥ 0; required for `custom`, null for `break_even` |
| `currency` | ISO 4217 code; `PHP` in v1 |
| `revision`, timestamps | Common metadata |

`CHECK ((payment_mode = 'custom' AND custom_fee_per_head_minor IS NOT NULL) OR (payment_mode = 'break_even' AND custom_fee_per_head_minor IS NULL))`. The break-even amount, amount collected and profit/loss are derived, not stored.

## `session_shuttle_plan_lines`

| Field | Type / rule |
|---|---|
| `id` | UUID PK |
| `club_id`, `session_id` | Scoped FK to the estimate's session |
| `inventory_item_id` | Scoped FK `(club_id, inventory_item_id)` to an item whose category is `shuttlecocks` (validated by command; category can change later) |
| `tubes` | Integer `CHECK (tubes > 0)`; zero-tube lines are not saved |
| `position` | Small integer for display order |

Unique `(session_id, inventory_item_id)` is **not** required: the prototype allows two lines for the same brand. Lines may exceed current stock; that is a warning, not a constraint.

## `session_payment_marks`

| Field | Type / rule |
|---|---|
| `session_id`, `session_player_id` | Composite PK; scoped FKs to the session and roster entry |
| `club_id` | Scope |
| `amount_minor`, `currency` | Amount due when ticked: the full payment per head (custom amount, else break-even share); evidence only |
| `marked_at`, actor/device | When and where it was ticked |

Unticking deletes the row (keep an audit event if history matters). Marks are ordinary sync operations and work offline. Totals (paid count, collected, still due, against costs) are derived.

## Calculation

Totals are derived, never stored as authoritative values. For PHP, every monetary value below is in **centavos**, including the returned break-even amount:

- court cost = round(court fee × court count × session minutes ÷ 60), to the nearest centavo using current courts and scheduled times,
- entrance fees = entrance fee per head × players,
- shuttle cost = Σ tubes × item unit cost,
- total = rounded court cost + entrance fees + shuttle cost,
- break-even = 100 × ceil(total ÷ (100 × max(1, players))), where players is the roster count or `queue_sessions.expected_players`.

Thus 100 centavos shared by three players gives a break-even payment of 100 centavos (₱1), not 34 centavos. A custom payment remains its entered minor-unit value; it does not inherit whole-peso break-even rounding. Expected collection uses the current payment per head × player count; actual collected totals sum the amounts recorded in paid marks, not the current fee × paid count. These restate the [settled business rules](../../../../business_logic/product/queue/modules/financials/README.md) and existing money tests; maximum ranges and the meaning of a paid tick without a fee remain decision work in [#245](https://github.com/jose-codegourmet/rotra-v2/issues/245).

The prototype reads the **current** inventory price, so editing an item's cost changes saved estimates. Snapshotting `unit_cost_minor` onto each plan line at save time would freeze estimates instead; that choice is open and should be made before implementation.

## Sync and access

- Estimates are saved with the session setup command, online only. They are not part of the downloaded operational working copy and never enter sync operations.
- Inventory is club data behind the license entitlement. Offline inventory editing is not specified.
- Neither table is ever included in public session projections, result snapshots, or exports.

Business source: [financials](../../../../business_logic/product/queue/modules/financials/README.md).
