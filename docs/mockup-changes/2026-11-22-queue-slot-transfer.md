# Queue: Transfer my slot, the player's request and the Queue Master's Approve or Reject before Start

Status: IN MOCK APP — #1011
Date: 2026-11-22
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › public session page › My night (`myNight`) › Transfer my slot; sheet `slotTransfer`; Requests (`requestsPanel`) › Slot transfers (`transferRow`)
Route: /s/<slug> (My night, signed-in confirmed player), /queue/sessions/<id>/preparation (Requests card)
Screen ID: Q-PUBLIC-JOIN (My night), Q-PREPARE (Requests)
Artifact: none
Components: slot-transfer-row (new), forms/slot-transfer-form (new), join-requests-panel (extended with `transfers`), my-night-card (extended with `onTransfer`, `transferPendingTo`, `onWithdrawTransfer`)
Supersedes: none
Superseded by: none

## What changed
- My night, before the start, for a signed-in confirmed player: a **Transfer my slot** button beside **I can't make it**.
- It opens **Transfer my slot**: the intro "Give your slot to another ROTRA player. The Queue Master approves it before the session starts (DATE, TIME); until then you keep your slot. Requests still waiting at the start close.", the field **Their RTR ID** (hint "Ask them for the RTR ID on their ROTRA profile."), **Find**, the found player (picture, name, RTR ID, "On the waitlist #N · leaves the waitlist if approved" or "Not in this session yet"), and **Cancel** / **Send transfer request** (enabled only once a player is found).
- Find takes the exact RTR ID of a registered ROTRA player only (never a name, a guest or an unclaimed person). Refusals: "Enter the full RTR ID, like RTR-PH-CEB-102926-0001.", "No registered ROTRA player has that RTR ID.", "That's your own RTR ID.", "NAME already has a slot in this session."
- After sending: toast "Transfer to NAME sent · the QM decides"; My night reads "Transfer to NAME requested · the QM decides" with **Withdraw request** (toast "Transfer request withdrawn"). One pending transfer per slot.
- Requests (before Start): a sub-list **Slot transfers · N** after **Can't make it · N** ("Nothing changes until you approve. Requests still waiting at the start close."). Each row: the sender's picture and name, "Asks to transfer their slot · TIME", "To NAME · RTR ID", a chip **Waitlist #N** or **Not in this session**, "Approving gives the slot to NAME(, who leaves the waitlist). SENDER comes off the roster. The slot count stays the same.", a level select (preset to the recipient's waitlist or saved level; "Choose a level for this club before approving."), **Reject** and **Approve**. Requests · N counts them.
- Approve: the recipient takes the sender's place in the roster (a waitlisted recipient leaves the waitlist), the sender comes off the roster, the slot count is unchanged; the recipient's own pending join request and the sender's open drop-out notice close. Toast "SENDER's slot now belongs to RECIPIENT". Refused when the recipient got a slot meanwhile.
- Reject: nothing else changes; the sender keeps the slot and every payment record. Toast "Transfer rejected · SENDER keeps the slot".
- Start expires every pending transfer; Cancel session cancels them.

## Why
- Epic #1009 / ticket #1011; owner decisions on #1015, November 22, 2026 (confirmed decisions of the epic: before session start only, pending requests expire at start, waitlisted recipient promoted, already-confirmed recipient ineligible, plain rejection keeps registration and payment).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: My night with and without a pending transfer; the sheet empty, finding, found (waitlisted and not), each refusal; Requests with transfers only, with drop-out notices and transfers, with transfers and join requests; level missing on Approve; recipient already confirmed on Approve.
- Copy: every string listed above.
- Tokens: none new.
- Known differences: the mockup looks recipients up in its own saved players and `DIRECTORY`; the real app looks up `player_id_allocations` (claimed, listed profiles). The sender's paid mark stays on their released entry in both (#1013 adds the accounting view).

## Reuse plan
- Reuses as is: Sheet, Field, TextInput, Avatar, Chip, LevelSelect, Button, Notice
- Extends: JoinRequestsPanel (`transfers`), MyNightCard (`onTransfer`, `transferPendingTo`, `onWithdrawTransfer`)
- New: SlotTransferRow, SlotTransferForm

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md (Slot transfers)
- Database design: docs/database_design/product/queue/modules/sessions-roster.md (`session_slot_transfers`, `roster_release_reason.transferred`)
- Screen docs: docs/screens/product/modules/queue/public-session.md, docs/screens/product/modules/queue/session-setup.md
- Product terms: Slot transfer
- Decision: D-2026-11-22-03

## Real app work
- Done in the same commit: `@rotra/data/slot-transfer` (mock store, rules, fetchers, hooks), `SlotTransferRow`, `SlotTransferForm`, `JoinRequests` and `MyNight` wiring, real mode through `packages/db/src/queue/slot-transfers.ts`, the Player app routes `POST /api/public-sessions/[slug]/slot-transfer`, `…/slot-transfer/lookup`, `…/slot-transfer/withdraw` and the Queue app routes `POST /api/sessions/[sessionId]/requests/transfers/[transferId]/approve` and `…/reject`; migration `20261122000400_session_slot_transfers` (applied to a local disposable database only).
- Later tickets of epic #1009, not built here: transfer links (#1012), waiver and payment accounting with the chain view (#1013), refunds and FIFO promotion (#1014), leaving a club cancels pending transfers (#1018).
