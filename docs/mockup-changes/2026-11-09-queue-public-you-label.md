# Session page: the signed-in viewer's own tile is labelled You

Status: NEW
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › Participants, Waitlist
Route: /queue/s/x-next-full (View as: a confirmed or waitlisted stage)
Screen ID: Q-PUBLIC-PARTICIPANTS
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: public-participant-tile, chip
Supersedes: none
Superseded by: none

## What changed
- When the signed-in Player is on the roster or the waitlist, their own tile shows a **You** pill under the name: accent background, on-accent text, 12 px uppercase, and the picture ring turns accent. Other tiles are unchanged.

## Why
- Owner comment on the published artifact, November 9, 2026: “since player is already in the roster there should be a green bg white text label labeled as "you"”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: viewer confirmed (Participants grid), viewer waitlisted (Waitlist, with the number badge), viewer not in the session (no pill).
- Copy: “You”.
- Tokens: `--accent`, `--on-accent`
- Known differences: the owner asked for white text; the pill uses `--on-accent`, which is white in the light theme but dark in the dark theme (white on the bright dark-theme green fails contrast). Owner to confirm.

## Reuse plan
- Reuses as is: `chip/` (solid accent variant)
- Extends: `public-participant-tile/` (`isViewer` prop: pill and accent ring)
- New: none
- Shares work with: 2026-11-09-queue-public-profile-links

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/public-session.md — Masked names paragraph

## Real app work
- Signed-in participant projection marks the viewer's own row; `public-participant-tile` renders the You pill and accent ring.
