# Copy invite link added to the Preparation header, next to Preview public page

Status: IN MOCK APP — #470 (PR #482)
Date: 2026-11-07
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Preparation (header)
Screen ID: Q-PREPARE

## What changed
- **Preparation header:** Edit preparation · Preview public page · **Copy invite link** (new) · Copy Facebook post · Delete session · Cancel session. Before: the public link could only be copied from the Session link card on the Overview tab.
- The button copies the public session link (the same link as the card) and toasts "Session link copied".

## Why
- Operators want to share the player invite link without scrolling to the Overview card or opening the Facebook post.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/session-setup.md — header actions list the new action and its toasts

## Real app work
- Add the header button in SessionPreparation.tsx reusing the existing copy handler; clipboard failure shows the link in an error toast; Accept join requests off adds a "joining is not open yet" note.
