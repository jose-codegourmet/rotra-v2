# Session page: Courts now shows the Queue Master's court cards, read-only

Status: IN MOCK APP — #585
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › Details › Courts now
Route: /queue/s/<Full house session id> (View as: Confirmed · in queue)
Screen ID: Q-PUBLIC-DETAILS (Courts now)
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: court-card, court-pitch, chip, avatar, public-session-details
Supersedes: none
Superseded by: none

## What changed
- **Courts now** replaces its simple tiles with the console's court cards, read-only: the court label and a chip (**Playing** with the green glow, **Getting ready**, or **Free**), the court drawing with each team's pictures and first names on its side, and “Started 9:16 PM” (or “Waiting to start”) under it.
- A free court shows the drawing with “Free” across it. A match on merged courts shows one card titled “Court 1 + Court 2” with **Merged · Playing** / **Merged · Getting ready** on the tall court drawing.
- No format label, no court menu, no buttons. Names follow the public name rules (masked where they are masked elsewhere). Still no score and no running time.

## Why
- Owner request on the published artifact, November 9, 2026: Courts now should look like the Queue Master's court cards. (The owner's comment text was not available when this log was written; to be pasted in.)

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: playing, getting ready, free, merged courts; masked and full names.
- Copy: “Playing”, “Getting ready”, “Free”, “Merged · Playing”, “Merged · Getting ready”, “Started TIME”, “Waiting to start”.
- Tokens: none new (existing `.court`, `.pitch`, `.side`, `.pf` styles).
- Known differences: none.

## Reuse plan
- Reuses as is: `court-pitch/`, `chip/`, `avatar/`
- Extends: `court-card/` (read-only variant: no menu, no actions, no format label, public names)
- New: none
- Shares work with: 2026-11-09-queue-public-queue-rows, 2026-11-09-queue-player-my-night

## Docs updated
- Business logic: none (what is shown is unchanged: players per court, start time, no score)
- Database design: none
- Screen docs: docs/screens/product/modules/queue/public-session.md — Details tab, signed in, live session
- Terms: none

## Real app work
- Render the public Courts now with the read-only court card variant.
