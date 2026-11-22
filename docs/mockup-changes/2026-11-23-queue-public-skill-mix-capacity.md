# Public page: the Skill mix bar spans the slot budget

Status: IN MOCK APP — no ticket (owner bug report, fixed in the mockup and the app together)
Date: 2026-11-23
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `skillMix`, the Want to play? join card
Route: /s/[slug] (public session page)
Screen ID: Q-PUBLIC-SESSION
Components: skill-distribution-bar, join-request-card
Supersedes: none
Superseded by: none

## What changed
- **Bug.** The Skill mix bar on the Want to play? card sized its segments against the players only, so 4 confirmed
  players filled the whole bar while the card said “20 slots left”.
- **Fix.** The bar now spans the slot budget, like the roster tab's slot meter: colored segments are the confirmed
  players by skill group and a grey remainder is the open slots (hover or focus: “20 open slots”). When every slot is
  taken there is no remainder.
- **App.** `SkillDistributionBar` takes an optional `capacity`; `JoinRequestCard` passes it for the `open` variant.

## Docs
- Business logic and database design: unchanged (display only).
