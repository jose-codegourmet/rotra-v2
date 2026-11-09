# Session page: full names and one-tap join for signed-in players, three ways in

Status: NEW
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › proto-bar “View as”, Want to play? card, Request to join sheet, Participants, Queue
Route: /queue/s/s-tonight
Screen ID: Q-PUBLIC-JOIN, Q-PUBLIC-PARTICIPANTS
Artifact: none
Components: public-participants, public-session-queue, join-request-card, segmented-control, notice, button
Supersedes: none (narrows the #475 masking and the #569 cap rules in place)
Superseded by: none

## What changed
- Before: every name masked for every audience; the three-row cap removed only for confirmed players; the sheet offered Continue as guest and Log in with ROTRA Player.
- After, signed-in ROTRA player: registered players show their full name with the nickname under it (small, muted) on Participants, the waitlist, Courts now and the Queue; guests stay masked `J*** A***`; the three-row cap is gone for participants and the waitlist. Visitors see everything masked and capped as before.
- Signed-in player not in the session: the Want to play? card shows **Request to join as NAME** (no form). One tap sends; the card becomes **Request sent** with **Cancel request**. A second request is impossible while one is pending.
- The visitor's Request to join sheet has three choices: **Continue as guest** (selected, the form), **Log in with ROTRA Player**, **Register with ROTRA**. The last two show one line, a notice and a primary button; in the prototype they sign the viewer in as a sample ROTRA player and the join card shows the one-tap button.
- Prototype only: the proto-bar has a **View as** select (Visitor, Guest · request sent, Signed-in player · not in the session, Signed-in · waitlisted, Confirmed at each stage, and View published / View unpublished on a finished session).

## Why
- D-2026-11-09-02 and D-2026-11-09-06 (owner discussion, November 9, 2026): “the player already has a rotra account. why would they need to sign up again?”; a signed-in player “sees full roster with full names”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: visitor (masked, capped); signed-in not in session (one-tap button); request sent (Cancel request); waitlisted; declined; requests off; sheet with each of the three choices selected.
- Copy: “Request to join as NAME”; “One tap sends your request and the Queue Master confirms it.”; “Request sent” / “Thanks, NAME. The Queue Master confirms every request, usually at the venue. Your slot isn't held until they do.”; “Cancel request”; “Continue as guest”, “Log in with ROTRA Player”, “Register with ROTRA”; “Log in with ROTRA Player and you come back here signed in, with your request ready to send.”; “Register with ROTRA under CLUB and you come back here signed in, with your request ready to send.”; “Logging in or registering never gives a slot. The Queue Master confirms every request.”
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: `notice/`, `button/`, `segmented-control/`, `chip/`
- Extends: `public-participants/` (full-name + nickname tile variant, `uncapped` for any signed-in viewer); `public-session-queue/` (name rule); `join-request-card/` (signed-in variant: one-tap button, Cancel request); the Request to join sheet in `apps/queue` (third choice)
- New: none
- Shares work with: 2026-11-09-queue-player-my-night, 2026-11-09-queue-player-self-check-in

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — Join requests (signed-in), Public participant names, #569 note
- Database design: docs/database_design/product/queue/modules/sessions-roster.md — `session_join_requests.player_id`, `invite_code_id`
- Screen docs: docs/screens/product/modules/queue/public-session.md — Q-PUBLIC-JOIN sheet, Masked names, Signed-in Player section

## Real app work
- Server: name projection by viewer (signed-in vs visitor), uncapped roster for signed-in Players, account-carrying join request with one-open-per-account, Cancel request; Player registration entry from the session link with return.
- `apps/queue` `/s/[slug]`: three-choice sheet, one-tap join card, request sent / cancel states; `@rotra/ui` variants above with stories in both themes.
