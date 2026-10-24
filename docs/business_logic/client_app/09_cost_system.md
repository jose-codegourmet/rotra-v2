# 09 — Cost System

## Overview

The Cost System gives Que Masters a transparent, formula-driven way to calculate and track session expenses. Each player's share is computed automatically based on the total cost and the number of accepted players. Payment is tracked manually by the Que Master.

> **Canonical Que Session rules:** See [`08_queue_session.md`](./08_queue_session.md) §21 Financials, §22 Collections, and §23 Shuttle Information. This document defines the cost formula; visibility and collection UX are specified in the canonical session doc.

---

## 9.1 Cost Inputs

The Que Master enters these values during session setup or during the session as costs become known:

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| Court cost | Number | Yes | Total rental cost for all courts for the full session duration |
| Shuttle entries | Multi-entry | No | Brand, type, planned tubes, cost per tube — see §9.1a |
| Shuttles consumed | Integer | No | Sum of consumed tubes across entries; updated during Active session |
| Optional markup | Number or % | No | Flat amount or percentage added on top of actual cost (e.g. for organizer convenience fee) |

### 9.1a Shuttle entries

Que Sessions support **multiple shuttle entries** per session (see [`08_queue_session.md`](./08_queue_session.md) §23). Each entry tracks:

- Shuttle brand and type (when tracked)
- Planned number of tubes
- **Consumed** number of tubes (updated during Active session)
- Cost per tube

Actual shuttle cost for the formula uses **consumed** tubes × cost per tube, aggregated across entries. ROTRA does not track which person opened a tube or unused-tube carryover between sessions.

### When Costs Are Entered

* **Court cost**: set during session setup (known in advance)
* **Shuttle entries**: set during setup; consumed quantities updated mid-session
* **Markup**: set during setup; can be changed before session completion

---

## 9.2 Per-Player Cost Calculation

```
total_cost = court_cost + sum(consumed_tubes_per_entry × cost_per_tube_per_entry)
base_per_player = ceil(total_cost / number_of_accepted_players)

if markup_type == "flat":
    per_player_cost = base_per_player + markup_flat_amount

if markup_type == "percentage":
    per_player_cost = ceil(base_per_player × (1 + markup_percentage / 100))

if no markup:
    per_player_cost = base_per_player
```

* `ceil()` rounds up to avoid fractional currency amounts
* The number of accepted players used is the count at the **time of calculation** — it updates if players exit or new players are promoted from the waitlist
* The Que Master can recalculate at any point during the session
* A cost preview is shown during session setup so the Que Master can validate before opening the session
* **Estimation display** (estimated games, wait time, fees before final totals): calculation method **TBD** — see [`08_queue_session.md`](./08_queue_session.md) §37

---

## 9.3 Cost Preview & Transparency

**Visibility rules (canonical):**

| Data | Player (self) | Other players | Club Owner / Que Masters |
| ---- | ------------- | ------------- | ------------------------ |
| Own per-player cost / breakdown | Yes | — | Yes |
| Own payment status | Yes | — | Yes |
| Others' payment status | No | No | Yes |
| Markup / profit | No | No | Yes |
| Shuttle brand & quantity | Yes (when shuttles shown) | — | Yes |
| Shuttle cost | Only when shuttle-cost visibility enabled (default: Off) | — | Always |

* Each player sees **their own** calculated cost and breakdown (court, shuttle, player count share, markup line if applicable to their amount)
* Players **cannot** see other players' payment status or private markup/profit
* Cost updates in realtime as hosts adjust shuttle consumption or markup
* Shuttle-cost visibility to Players is a per-session setting; **default: Off**

---

## 9.4 Player Payment Tracking

Each accepted player has a payment record in the session:

| Status | Meaning | Who Sets It |
|--------|---------|------------|
| Unpaid | Default when player joins | System |
| Paid | Player has settled the full amount | Que Master |
| Partial | Player has paid less than the required amount | Que Master |

* Payment is collected and tracked manually by the Que Master (cash, e-wallet, or any agreed method)
* ROTRA does not process e-wallet payments, validate transactions, or require receipt upload
* The Que Master marks each player's status through the **Collections** area (see [`08_queue_session.md`](./08_queue_session.md) §22)
* Every payment change creates an **audit record** (previous/new amount and status, actor, timestamp, optional note)
* Payment records **cannot be changed** after the session becomes **Completed**

### Collections (Que Master View)

Displays a list of all financially obligated players with:

* Name + photo
* Amount due (computed per-player cost)
* Amount paid, remaining balance
* Payment status (Unpaid / Partial / Paid)
* Payment method, date/time, recorder (when recorded)
* Quick actions: Mark Paid, Mark Unpaid, Record Partial

Que Master can filter by payment status (e.g. show all Unpaid players).

---

## 9.5 Early Exit Payment Rule

When a player exits the session early:

1. Que Master opens the exit flow for that player
2. Payment status is checked:
   * If **Paid**: exit confirmed immediately
   * If **Unpaid or Partial**: Que Master must confirm that the player has settled before proceeding
3. Que Master taps "Confirm Payment & Exit"
4. Player status changes to Exited; slot opens per waitlist rules

An early-exiting player pays the **full session cost**, not a pro-rated amount. They agreed to the full cost by joining.

**Late cancellation** (after 5-hour cutoff, before I Am In): player remains financially obligated unless host confirms replacement/swap resolution. See [`08_queue_session.md`](./08_queue_session.md) §14.

---

## 9.6 Session Cost Summary

At session close, the Que Master sees a cost summary:

| Summary Item | Description |
|-------------|-------------|
| Total cost | court_cost + shuttle costs from consumed tubes |
| Collected | Sum of payments from all Paid + Partial players |
| Outstanding | Total owed by Unpaid and Partial players |
| Markup collected | Total markup amount included in payments |
| Player count | Accepted players at session close |

The summary is exportable as a simple text report (future: PDF or shareable image).

A session cannot become **Completed** until all financially obligated players are marked **Paid** and no unresolved required collections remain.

---

## 9.7 Future: Payment Platform Integration

Phase 3 plans integration with local payment platforms:

* GCash (Philippines)
* PayMaya / Maya (Philippines)
* Potentially: generic payment link generation (for other regions)

When integrated, players will be able to pay their session fee directly through the app. The Que Master will see payment confirmations automatically without manual entry.

Until then, ROTRA does not require payment gateway integration, automatic e-wallet validation, receipt upload, or transaction-reference submission. Refunds on cancelled sessions are resolved manually outside ROTRA.
