# Queue app: level rings on the public page's Courts now and Queue

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `pubLv`, `pubCourtSides`, `courtsNow`, public Queue tiles in `viewPublic`
Route: /queue/s/<slug> (Details tab, signed in, live session)
Screen ID: Q-PUBLIC
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: court face (`pf`), queue face (`qf`)
Supersedes: none
Superseded by: none

## What changed
- Before: on the public session page, the faces on the Courts now cards and Queue tiles had no level ring. The
  Participants grid already had rings.
- After: those faces carry the same level ring as the console: beginner blue, intermediate yellow, advanced red, and
  grey when the player hasn't been assessed. The ring stays the only level the public page shows.

## Why
- Owner artifact comment, November 19, 2026, on the public page of Packed Courts Open Play: “please put the skill
  borders”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: signed in as confirmed, in queue and on court; merged courts; a player with no level.

## Copy
- None.

## Open
- None.

## Docs updated
- screens/product/modules/queue/public-session.md (level rings on Courts now and the Queue).
