# Session QR button and sheet added to the Preparation header

Status: IN MOCK APP — #471 (PR #482)
Date: 2026-11-07
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Preparation (header) › Session QR sheet
Screen ID: Q-PREPARE

## What changed
- **Preparation header:** Edit preparation · Preview public page · Copy invite link · **Session QR** (new) · Copy Facebook post · Delete session · Cancel session.
- **Session QR sheet (new):** a QR of the public session link, club name · date · time · venue, the link as small text, and **Download QR image**, **Share**. The QR is dark on light in both themes. The prototype shows a static placeholder code.

## Why
- Operators want a scannable image to drop into a Facebook post or print for the venue, not just a link.

## Docs updated
- Business logic: none needed (scanning lands on the normal public page; no rule changes)
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/session-setup.md — Q-PREPARE header actions list the Session QR sheet

## Real app work
- New `SessionJoinQr` component in @rotra/ui; header button and sheet in SessionPreparation.tsx. The QR encodes the public `/s/<publicSlug>` link only.
