# Cost System Specification

## Purpose

Documented session cost inputs, per-player formula, payment tracking, early-exit settlement, and visibility. Collection UX is specified with Que Sessions.

## Status

**Documented product rules** from `docs/business_logic/client_app/09_cost_system.md`. Payment-gateway integration is Phase 3 future. Not implemented as live payment APIs.

## Actors

Que Master, Club Owner, accepted players.

## Requirements

### Requirement: Cost inputs
The host SHALL enter court cost (required) and MAY enter multiple shuttle entries (brand/type, planned tubes, consumed tubes, cost per tube) and optional markup (flat or percentage). Actual shuttle cost SHALL use consumed tubes × cost per tube, aggregated across entries. ROTRA SHALL NOT track who opened a tube or unused-tube carryover.

#### Scenario: Consumed tubes
- GIVEN two shuttle entries with consumed 1 and 2 tubes at ₱200 each
- WHEN total cost is calculated
- THEN shuttle cost is ₱600 plus court cost

### Requirement: Per-player formula
```
total_cost = court_cost + sum(consumed_tubes_per_entry × cost_per_tube_per_entry)
base_per_player = ceil(total_cost / number_of_accepted_players)
```
Flat markup SHALL add to `base_per_player`. Percentage markup SHALL be `ceil(base_per_player × (1 + markup_percentage / 100))`. Accepted-player count SHALL be the count at calculation time and SHALL update when players exit or waitlisted players are promoted. Estimation display for games/wait/fees before finals is TBD.

#### Scenario: Ceil split
- GIVEN total cost 1000 and 3 accepted players and no markup
- WHEN per-player cost is calculated
- THEN each player owes ceil(1000 / 3)

### Requirement: Visibility
Each player SHALL see their own per-player cost, breakdown, and payment status. Players SHALL NOT see others' payment status or private markup/profit. Markup/profit SHALL be visible only to Club Owner and assigned Que Masters. Shuttle-cost visibility to players SHALL be a per-session setting, default Off.

#### Scenario: Other player's payment hidden
- GIVEN Player A is accepted
- WHEN they open cost details
- THEN they see their own status
- AND they do not see Player B's payment status

### Requirement: Payment statuses
Each accepted player SHALL have Unpaid (default), Paid, or Partial, set by the Que Master. Payment SHALL be tracked manually. ROTRA SHALL NOT process e-wallet payments, validate transactions, or require receipts. Every payment change SHALL write an audit record. Payment records SHALL NOT change after the session is Completed.

#### Scenario: Mark paid
- GIVEN an accepted player is Unpaid
- WHEN the Que Master marks Paid
- THEN status becomes Paid
- AND an audit record is written

### Requirement: Early exit and completion
Early exit SHALL require full session payment (not pro-rated). If Unpaid or Partial, the Que Master MUST confirm settlement before Exited. Late cancellation after the 5-hour cutoff and before I Am In SHALL keep financial obligation unless the host confirms replacement/swap. A session SHALL NOT become Completed until all financially obligated players are Paid and no unresolved required collections remain.

#### Scenario: Unpaid early exit blocked
- GIVEN an accepted player is Unpaid
- WHEN they request Early Exit
- THEN the slot is not released until the Que Master confirms payment

### Requirement: Payment platforms are future
GCash, Maya, and in-app payment links are Phase 3. Until then, refunds on cancelled sessions SHALL be resolved manually outside ROTRA.

#### Scenario: No gateway in documented MVP
- GIVEN a player owes a session fee
- WHEN they pay
- THEN the Que Master records it manually

## Source

- `docs/business_logic/client_app/09_cost_system.md`
- `docs/business_logic/client_app/08_queue_session.md`
- `docs/business_logic/client_app/18_canonical_rules.md`
