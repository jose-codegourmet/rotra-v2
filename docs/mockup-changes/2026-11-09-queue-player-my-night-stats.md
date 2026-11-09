# Session page: My night shows games and Won / Lost as big numbers; Invite only before the start

Status: IN PROGRESS — #585
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › My night card
Route: /queue/s/<Full house session id> (View as: Confirmed · in queue / minimum reached / finished / before start)
Screen ID: Q-PUBLIC-DETAILS (My night)
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: card, progress-bar, stat-tile, button
Supersedes: none
Superseded by: none

## What changed
- **Stats panel** at the top of My night (live and present): the games played as a big number with “games played · minimum N”; a progress bar toward the minimum, amber, turning green at the minimum; then “N more to reach the minimum” or “Minimum reached”. Beside it, **Won** and **Lost** big-number tiles (green, red). One column at 420 px and narrower.
- The old text lines (“3 of 6 games played · 2W 1L”, “6 of 6 · Minimum reached”, “7 games · minimum 6”) are gone.
- Finished sessions show the panel without the bar and minimum, then “Session finished” and **Match history**.
- **Invite** (confirmed or waitlisted) shows only while the session has not started (status Prepared); it is hidden once the session is live, finished or cancelled. The invite action is blocked the same way.

## Why
- Owner request on the published artifact, November 9, 2026: games played and Won / Lost should stand out as big numbers with progress toward the minimum, and players should only invite before the session starts. (The owner's comment text was not available when this log was written; to be pasted in.)

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: below the minimum, at the minimum, above it, no minimum, finished; Invite before start (confirmed and waitlisted) and absent when live.
- Copy: “games played · minimum N”, “N more to reach the minimum”, “Minimum reached”, “Won”, “Lost”, “Session finished”.
- Tokens: none new (`--warn`, `--accent`, `--accent-subtle`, `--error`, `--error-subtle`); new classes `.mn-*`.
- Known differences: none.

## Reuse plan
- Reuses as is: `card/`, `button/`
- Extends: `my-night-card/` (stats panel; Invite gated on Prepared)
- New: a stat tile and a progress bar, unless `@rotra/ui` already has them (check first)
- Shares work with: 2026-11-09-queue-player-my-night, 2026-11-09-queue-session-invite

## Docs updated
- Business logic: none in business_logic; note that docs/mvp/decisions.md D-2026-11-09-08 still says confirmed and waitlisted players can invite without the “before the start” limit (decision register, left for the owner)
- Database design: none
- Screen docs: docs/screens/product/modules/queue/public-session.md — My night card
- Terms: none

## Real app work
- My night stats panel; hide Invite and refuse the invite flow once the session is not Prepared.
