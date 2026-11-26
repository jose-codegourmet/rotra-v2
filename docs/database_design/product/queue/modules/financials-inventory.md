# Session cost estimates and club inventory

**Last verified:** 2026-11-22 for `session_payment_refunds`, marks frozen by a refund and net kept totals ([D-2026-11-22-06](../../../../mvp/decisions/2026-11-22.md#d-2026-11-22-06), #1014; migration `20261122000700_session_payment_refunds`: applied to a local disposable database 2026-11-22 only, not to the shared database); 2026-11-22 for marks frozen by an approved slot transfer and waivers in the totals ([D-2026-11-22-05](../../../../mvp/decisions/2026-11-22.md#d-2026-11-22-05), #1013); 2026-10-28 for calculation units; payment lifecycle remains proposed.

**Status:** Proposed data model, added October 26, 2026 for the [financials rules](../../../../business_logic/product/queue/modules/financials/README.md) introduced by the [ROTRA Queue prototype](../../../../../apps/mockup/queue-app/rotra-queue.html). Field names are new design names, not existing Prisma columns.

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

Removing an item is a soft remove because past session estimates may reference it. Stock changes are direct updates guarded by `revision`; Session done decrements stock by each shuttle plan line's tubes inside the finalization transaction, clamped at zero, skipping removed items ([D-2026-11-26-01](../../../../mvp/decisions/2026-11-26.md#d-2026-11-26-01)); the one `session_finalizations` row per session keeps it to once. If stock history is wanted later, add an append-only adjustment table rather than overloading this row.

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
| `amount_minor`, `currency` | **Amount received** (owner decision, November 7, 2026, #479; no migration): a quick tick records the amount due then (the full payment per head); the amount editor records what was entered. Never rewritten by a pricing change. Legacy null counts as paid in full at today's amount due. Evidence only |
| `marked_at`, actor/device | When and where it was ticked or the amount was recorded |

Unticking deletes the row (keep an audit event if history matters). Recording an amount replaces the row (delete, then insert under the new operation ID); 0 deletes it. Marks are ordinary sync operations and work offline. Status and totals are derived against the **current** amount due: Paid (received = due), Partial (0 < received < due), Reimburse (received > due), Unpaid (no row or 0); paid count = Paid + Reimburse, collected = Σ received, still due = Σ max(due − received, 0) over the roster, to reimburse = Σ max(received − due, 0), against costs = collected − total cost. Reimburse is a label; no refund rows are stored.

**Slot transfers (#1013, [D-2026-11-22-05](../../../../mvp/decisions/2026-11-22.md#d-2026-11-22-05)).** An approved transfer never writes or changes a mark. The sender's mark stays on their released entry and is **frozen**: trigger `session_payment_marks_frozen_by_transfer` refuses UPDATE and DELETE of a mark whose entry sent an approved transfer decided at or after `marked_at`. The transfer row snapshots the slot's cash and the automatic waiver ([`session_slot_transfers`](sessions-roster.md#session_slot_transfers)); the recipient's entry carries them. Totals then use, per live entry, received = own cash + carried cash and waived = the slot's waivers: collected = Σ received (never a waiver), waived = Σ waived, still due = Σ max(due − received − waived, 0), to reimburse = Σ max(received − due, 0). A transferred-in entry's mark cannot be ticked, unticked or edited (no second payment).

**Cancelled sessions (proposed, November 6, 2026).** Marks on a `cancelled` session are kept as they were and become read-only: ticks and unticks are refused like on an invalid session ([log](../../../../mockup-changes/2026-11-06-queue-example-sessions-and-cancel.md)). Refunds handed back outside ROTRA are recorded in [`session_payment_refunds`](#session_payment_refunds) (#1014).

**Refunds (#1014).** A mark whose entry has a `session_payment_refunds` row is **frozen**: trigger `session_payment_marks_frozen_by_refund` refuses UPDATE and DELETE (`restrict_violation`). Readers subtract the refund from the entry's cash (own + carried): per live entry, kept = max(received − refunded, 0); collected = Σ kept, refunded = Σ refunded, against costs = collected − total cost, still due and status from kept. The services lock a refunded entry's payment ("This player's payment was refunded, so it can't be changed here.").

## `session_payment_refunds`

Manual full refund (#1014, epic #1009, [D-2026-11-22-06](../../../../mvp/decisions/2026-11-22.md#d-2026-11-22-06)): an informational record that the Queue Master handed a roster entry's whole cash back outside ROTRA. ROTRA moves no money. Schema file `packages/db/prisma/schema/queue/financials.prisma` (`SessionPaymentRefund`). Columns: `id`; `club_id`, `session_id` (scoped FK to `queue_sessions`); `session_player_id` (scoped FK `(club_id, session_id, session_player_id)` to `session_players`); `reason` (`payment_refund_reason`: `transfer_rejected`, `session_cancelled`); `slot_transfer_id` (scoped FK `(club_id, session_id, slot_transfer_id)` to `session_slot_transfers`, unique; set exactly for `transfer_rejected`); `amount_minor` (centavos, > 0: the slot's whole cash at the time, never a waiver); `currency` (`PHP`); `refunded_at`; `created_at`.

- **One per entry, append-only.** Unique `(session_id, session_player_id)`; trigger `session_payment_refunds_final` refuses UPDATE and DELETE. A retry of Record refund returns the existing row; the id is derived from the entry (`derivedId(entry, 'refund')`) or the transfer (`derivedId(transfer, 'refund')`).
- **Coherent.** CHECKs `amount_check` (> 0), `currency_check`, `transfer_check` (`reason = 'transfer_rejected'` exactly when `slot_transfer_id` is set). Trigger `session_payment_refunds_coherent` (BEFORE INSERT): a transfer refund needs that transfer `rejected` with the refunded entry as its sender; a session refund needs the session `cancelled`.
- **Writes.** Reject and refund (`rejectAndRefundSlotTransfer`): under the session and transfer locks, mark the transfer `rejected`, insert the refund, release the sender's entry (`release_reason = 'refunded'`), close their open drop-out notice and, while a slot is open, promote the first waitlist row with a level in `orderedWaitlist` order (`promoteWaiter`). Record refund (`recordSessionRefund`): under the session lock, on a cancelled session's live roster entry with cash. Both recompute the amount and refuse (409) a different one than the Queue Master confirmed.
- **Access.** Server-only: RLS enabled, all privileges revoked from `anon`, `authenticated` and `PUBLIC`; never in public reads, snapshots or exports.

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
