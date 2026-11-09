# Session page: Details shows the payment per player

Status: IN PROGRESS — #585
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › Details
Route: /queue/s/x-next-full
Screen ID: Q-PUBLIC-DETAILS
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: key-value-list, public-session-details
Supersedes: none
Superseded by: none

## What changed
- The Details key-value list gets a **Payment** row after Minimum: “₱200 per player · paid at the venue”. The amount is the session's payment per player (the custom amount, or the break-even share). A 0 amount shows “Free”. With no cost estimate saved, the row is omitted.
- Shown to every audience (visitor, guest, signed-in player); the post template's `{{fee_per_head}}` already publishes the same figure.

## Why
- Owner comment on the published artifact, November 9, 2026: “this should show the player per head price” (Club Doubles Night).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: custom amount (₱200), break-even amount, Free (custom 0), no estimate (no row).
- Copy: “Payment”, “₱X per player”, “· paid at the venue”, “Free”.
- Tokens: none
- Known differences: “· paid at the venue” is prototype copy not in the comment; owner to confirm or drop.

## Reuse plan
- Reuses as is: `key-value-list/`
- Extends: `public-session-details/` (Payment row from the session's amount due)
- New: none
- Shares work with: none

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/financials/README.md — public visibility rule
- Database design: none needed (reads the saved estimate)
- Screen docs: docs/screens/product/modules/queue/public-session.md — Details table and acceptance example

## Real app work
- Add the amount due per player to the public session projection and the Payment row to `public-session-details`.
