# Public page waitlist shows as tiles with queue numbers

Status: IN MOCK APP — #500 (PR #551)
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › Participants › Waitlist
Screen ID: public session page
Route: /queue/s/s-tonight
Components: public-participants

## What changed
- Before: under the participant tiles the waitlist was a small numbered text list of masked names, easy to
  miss next to the large tiles.
- After: “Waitlist · N” shows the waitlisted players as the same tiles as the participants: picture with the
  level ring, masked name, slightly dimmed, with the queue number (1, 2, …) in a small badge on the picture.
  Same three per row on a phone and four on wider screens; not capped. The helper line now says players get
  a slot “in this order”.

## Why
- Owner comment on the artifact, November 8, 2026: the waitlist is not shown. The comment sat on the
  participants section where the waitlist list was; it was read as the plain list not reading as shown.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/public-session.md — Waitlist under the grid

## Like for like
- Compare at: 375 px and 1280 px, dark and light, beside the mockup route above.
- States and copy: exactly as listed under What changed; each ticket repeats them as acceptance criteria.
- Known differences: none

## Reuse plan
- Extends the existing public-session types and fetchers; no new hooks unless needed
- Extends `public-participants/`; reuses `avatar/`, level tokens from Q13.1
- Shares work with: `2026-11-08-queue-public-join-card-layout`, `2026-11-08-queue-public-participants-plain-grid`

## Tickets
- Epic: #500 (Q15)
- #513 Q15.1 · Public participants and waitlist carry their skill group
- #514 Q15.2 · Public participants: plain grid with level rings, open slots, capped list and waitlist tiles
- #516 Q15.4 · Public page and operator preview use the new participants and Want to play? card

## Verification — November 8, 2026
- Public page and operator preview wiring completed in #516 (PR #551).
- Component states checked in dark and light at 375 px and 1280 px, with the canonical prototype layout and copy.
- Signed-out public page renders; signed-out preview redirects to it. Roster CTA opens Request to join; Escape returns focus.
- End-of-list lint, type-check and build pass. Payload allowlist, masking, level labels and waitlist order checked with two passing temporary tests.
- Live database payloads and production deployment were not verified.
