# Session QR becomes a branded share card with a logo in the QR

Status: IN MOCK APP — #499
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Session preparation › Session QR sheet
Screen ID: Q-PREPARE (Session QR sheet)
Route: /queue/sessions/s-tonight/preparation
Components: session-join-qr, session-preparation

## What changed
- Before: a bare QR on white with the club name, date line and link as plain text.
- After: a branded share card, dark with the ROTRA green accent in both themes: club logo and name with
  “is playing badminton”, session title, date, time · venue, the QR with the **club logo (or initials) in
  the middle**, “Scan to join”, the link, and a ROTRA footer (“Run the game.”).
- A **Post | Story** switch sets the card to 4:5 (feed posts) or 9:16 (Facebook and Instagram stories).
  The download button is now “Download image” and names the file with the chosen format.
- The logo covers about 22% of the code width. Real QR generation needs the highest error-correction
  level and a scan test; this prototype uses a placeholder code.

## Why
- Owner comment on the artifact, November 8, 2026: the QR needs branding and looks because it is shared
  in Facebook posts and stories and Instagram stories; asked whether a logo in the middle can be supported.
  It can, with high error correction.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/session-setup.md — Session QR in the header actions

## Like for like
- Compare at: 375 px and 1280 px, dark and light, beside the mockup route above.
- States and copy: exactly as listed under What changed; each ticket repeats them as acceptance criteria.
- Known differences: none

## Reuse plan
- Extends `session-join-qr/` (its helpers only); reuses `club-logo/`, `segmented-control/` and `qrcode-generator` (already a dependency); do not change `player-id-qr/`
- Shares work with: `2026-11-08-queue-phone-header-more-options`, `2026-11-08-queue-phone-tabs-dropdown`, `2026-11-08-queue-title-public-page-icon`

## Tickets
- Epic: #499 (Q14)
- #511 Q14.3 · Session QR share card: Post | Story, club logo in the QR, Download image
- #512 Q14.4 · Preparation header, phone More options and preparation tabs menu

## Implementation verification (#511)
- Share-card component and stories implemented; preparation wiring remains in #512.
- Like-for-like browser comparison and PNG download checks are pending the full epic batch.
- Phone scanning of the downloaded QR images has not been verified.

## Q14 implementation verification (November 8, 2026)
- Downloaded Post and Story PNGs are 1080 × 1350 and 1080 × 1920. Native Vision QR decoding recovered the exact public-session URL from both formats, including the centered initials and vector-logo variants.
- Verified the fixed dark brand card in the light app theme and the Preparation session details/public link. Physical phone scanning and complete long-copy visual comparison remain unverified.
- Workspace lint, type-check and build ran at the end of the four-ticket list, per owner instruction.
