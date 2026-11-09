# Session page: Session invite share card for confirmed and waitlisted players

Status: TICKETED — #585
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › My night › Invite › Session invite sheet
Route: /queue/s/s-tonight
Screen ID: Q-PUBLIC-JOIN (My night › Invite)
Artifact: none
Components: session-join-qr, segmented-control, sheet, button
Supersedes: none
Superseded by: none

## What changed
- **Invite** button in the My night card for confirmed and waitlisted signed-in players; hidden when requests are off or the session has finished.
- It opens the Session QR share card (sheet title “Session invite”) with the same **Post | Story** switch and layout: headline “NAME invites you to play” (the player's name and avatar spot where the club name was), the session title, date, time · venue and the club name, the QR, “Scan to join” or “Waitlist open” when the session is full, and the link with `?invite=<code>`. The code is a random 8-character string made once per player and session, stored on the roster or waitlist row (`inviteCode`).
- Footer: **Close** and **Share** (toast “Share sheet opened” when the browser has Web Share), otherwise **Download image** as the existing card does. Note under the card: “The Queue Master sees who invited each person who joins through it.”

## Why
- D-2026-11-09-08 Session invite (owner discussion, November 9, 2026): “anything invitation is always a QR”; the QM's request card shows “Invited by NAME”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light (the card itself is the fixed dark brand card).
- States: Post and Story; Scan to join vs Waitlist open; Share vs Download image; Invite hidden (requests off, finished).
- Copy: “Invite”; “Session invite”; “NAME invites you to play”; “Scan to join”; “Waitlist open”; “Share”; “Download image”; “The Queue Master sees who invited each person who joins through it.”; toast “Share sheet opened”.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: `segmented-control/`, `sheet/`, `button/`
- Extends: `session-join-qr/` (headline and subline props, `waitlistOpen`, link with the invite code, Web Share button with download fallback)
- New: none
- Shares work with: 2026-11-09-queue-player-my-night

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — Join requests (“Invited by NAME”)
- Database design: docs/database_design/product/queue/modules/sessions-roster.md — `session_invite_codes`, `session_join_requests.invite_code_id`
- Screen docs: docs/screens/product/modules/queue/public-session.md — Session invite sheet

## Real app work
- `session_invite_codes` table and code creation on first open; `invite` allowed through the login and registration round trip; QM request card “Invited by NAME”; Web Share with the drawn image and the download fallback (not yet verified on real phones).
