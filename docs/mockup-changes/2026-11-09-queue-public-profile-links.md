# Session page: signed-in Players open a participant's ROTRA profile

Status: IN MOCK APP — #585
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › Participants, Waitlist
Route: /queue/s/x-next-full (View as: a signed-in stage)
Screen ID: Q-PUBLIC-PARTICIPANTS
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: public-participant-tile, public-session-participants
Supersedes: none
Superseded by: none

## What changed
- When the viewer is a signed-in ROTRA Player, every registered player's tile on the Participants grid and the Waitlist is a link to that player's ROTRA profile, opened in a new tab at the Player app's `/player/find/<RTR>` route. Hover or focus rings the picture in the accent colour and underlines the name; `aria-label` reads “NAME · view ROTRA profile”.
- Guest and unclaimed tiles, and every tile for a visitor, stay plain (no link), so no masked name ever links anywhere.

## Why
- Owner comment on the published artifact, November 9, 2026: “you should be able to click on the players since you are already signed in” (Waitlist).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: visitor (no links); signed-in with registered, guest and unclaimed tiles mixed; hover and keyboard focus on a linked tile; waitlist tile with its number badge.
- Copy: “NAME · view ROTRA profile” (aria-label only).
- Tokens: `--accent`, `--surface`
- Known differences: the Queue fixtures' RTR IDs do not exist in the Player prototype's directory, so the link lands on the Player app's neutral not-found page; in the real app the RTR ID resolves to the profile.

## Reuse plan
- Reuses as is: `avatar/`
- Extends: `public-participant-tile/` (link variant for registered players when the viewer is signed in)
- New: none
- Shares work with: 2026-11-09-queue-public-signed-in-names-join

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — Public participant names
- Database design: none needed (RTR ID is already on the player)
- Screen docs: docs/screens/product/modules/queue/public-session.md — Masked names paragraph

## Real app work
- Signed-in participant projection includes each registered player's RTR ID (never for guests); `public-participant-tile` renders the link variant to the Player app's find route.
