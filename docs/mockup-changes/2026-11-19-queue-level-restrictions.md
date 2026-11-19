# Queue app: Restrictions in session preparation (which levels can take a slot)

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `RESTRICT`, `restrictOf`, `restrictBlock`, `restrictText`, `restrictError`,
`draftFrom`, the Formats and mode step, `ACT.setRestrict`, `saveSetup`, `joinCard`, `ACT.confirmReq`, `ACT.confirmAdd`,
`ACT.confirmNew`, the Levels rows
Route: /queue/sessions/new and /queue/sessions/<id>/prepare (Formats and mode), /queue/s/<slug> (join card, Details)
Screen ID: Q-SETUP, Q-PREPARE, Q-START, Q-PUBLIC, the roster's Add player and join requests
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: Restrictions choice cards, slots-per-level fields, join card warning
Supersedes: none
Superseded by: none

## What changed
- **Setup › Formats and mode:** a new **Restrictions** field above Mode, one pick:
  - **All levels** (default).
  - **Beginners only**.
  - **Beginners to intermediate**.
  - **Slots per level:** Beginner, Intermediate and Advanced number fields, first split from the session's slots, with a
    running “N of CAP slots” line. They must add up to the session's slots before saving.
- **Levels row:** the review list, the preparation Setup card, the Start dialog and the public page's Details all show it.
- **Public page:** a signed-in player whose club level is outside the restriction, or whose band's slots are full, sees
  **Not open to your level** with the reason, and no request button. A player with no level can still request.
- **Queue Master:** confirming a join request or adding a player outside the restriction shows the reason with “Press …
  again to add NAME anyway.”; the second press adds them. The waitlist isn't checked.

## Why
- Owner, November 19, 2026, in the session: “please also add in the session preparation called restrictions: beginners
  only, beginners to intermediate only, all levels, 8 pax beginner – 8 pax Intermediate & 8 pax advanced. Think about it
  like what levels are allowed to be put in a slot”. Asked:
  - the four options, with slots per level editable;
  - players outside it can't request, but the Queue Master can override;
  - players with no level can request, and the Queue Master's chosen level counts.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States:
  - each option;
  - slots under, over and equal to capacity;
  - save refused;
  - public page as an allowed player, a blocked player, a full band, and a player with no level;
  - the Queue Master's confirm and add override.

## Copy
- “Restrictions” · “All levels · Any level can take a slot.” · “Beginners only · Only beginner levels can take a slot.” ·
  “Beginners to intermediate · Beginner and intermediate levels; no advanced.” · “Slots per level · Set how many
  beginner, intermediate and advanced slots.”
- “N of CAP slots · matches the session / X left to place / X too many” · “The slots add up to N; this session has CAP
  (C courts × P).” · “Use whole numbers, 0 or more.”
- Hint: “Which levels can take a slot. Players outside it can't request to join from the session page; you can still add
  them yourself after a warning. Players with no level yet can request, and the level you pick when confirming counts.”
- “Levels” row: the label, or “6 beginner · 5 intermediate · 5 advanced”.
- Public: “Not open to your level” · “This session is for beginners only.” · “This session is for beginners to
  intermediate only.” · “All N <band> slots are taken.” · “This session has no <band> slots.” · “Your level here is
  <level>.” · “You can't send a join request for this session. Ask the Queue Master if you think this is wrong.”
- Queue Master: “<reason> Press Confirm again to add NAME anyway.” · “<reason> Press it again to add NAME anyway.”

## Open
- Slots per level when courts change mid-session.
- Whether Generate Queue respects the restriction.
- Whether visitors see it before signing in (Details only today).

## Docs updated
- business_logic/product/queue/modules/players/README.md (Level restrictions on slots)
- database_design/product/queue/modules/sessions-roster.md (`level_restriction` and the band slot columns, proposed)
- screens/product/modules/queue/session-setup.md (Restrictions), public-session.md (Not open to your level)
- mvp/decisions.md (D-2026-11-19-12), mvp/workstreams/queue.md
