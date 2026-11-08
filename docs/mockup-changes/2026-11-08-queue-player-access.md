# Player access to the session queue and roster

Status: IN MOCK APP — #569
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Q-PUBLIC Details / Participants
Route: /queue/s/s-tonight
Screen ID: Q-PUBLIC-DETAILS / Q-PUBLIC-PARTICIPANTS
Artifact: none
Components: public-session-queue, match-card, public-participants, join-request-form
Supersedes: none
Superseded by: none

## What changed
- Details includes the existing Queue match tiles, read-only, for any signed-in Player. Anonymous viewers see “Log in with ROTRA Player to see the queue.”, “Full roster is for confirmed participants.”
- Only a Player confirmed on this session's roster sees every participant tile. Names stay masked and individual level rings remain.
- Prototype audience flags: `S.ui.playerSignedIn` and `S.ui.playerConfirmed`; neither is club authority.

## Why
Owner decision, November 8: “Queue for any signed-in Player; full roster only for confirmed participants”; “Preserve individual level rings”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: signed out, signed in, confirmed participant, empty waiting queue.
- Copy: “Queue”, “Read-only · Last synced queue”, “Waiting in queue”, “No matches queued yet.”, “Log in with ROTRA Player to see the queue.”, “Full roster is for confirmed participants.”
- Tokens: none.
- Known differences: none.

## Reuse plan
- Extends MatchCard with readOnly to remove actions, drag handle and profile controls.
- Extends PublicParticipants with fullRoster and participantCount.
- Extends JoinRequestForm with local draft change notification.
- New: PublicSessionQueue — composes the existing read-only match cards and access states; keeps all presentation in @rotra/ui.

## Docs updated
- Business logic: queue/modules/players/README.md — access policy.
- Database design: none needed; no schema changes.
- Screen docs: queue/public-session.md — queue and roster access.

## Real app work
#569 implements the Player-hosted authenticated projection and context-preserving return.
