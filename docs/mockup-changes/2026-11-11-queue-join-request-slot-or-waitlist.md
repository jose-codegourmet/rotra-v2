# Join request: the player picks Join a slot or Be waitlisted, and can join from the waitlist

Status: IN MOCK APP — #706
Date: 2026-11-11
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › Want to play? card, Request to join sheet, Confirmed · waitlist card; Session Preparation › Requests › Join (`joinReqCard`); Live session › Requests sheet
Route: /queue/s/s-tonight (View as: Visitor, Signed-in player · not in the session, Signed-in · waitlisted) and /queue/sessions/s-tonight/preparation?tab=roster
Screen ID: Q-PUBLIC-JOIN, Q-ROSTER (join requests panel), Q-CONSOLE (Requests sheet)
Artifact: none
Components: join-request-form, join-request-card, join-requests-panel
Supersedes: none
Superseded by: none

## What changed
- Before: a join request only asked for “a slot”; the Queue Master's confirmation put the player on the roster, or on the waitlist when every slot was taken. A waitlisted player could only “ask the Queue Master about a slot” in person.
- After, on the Request to join sheet (guest form) and on the signed-in one-tap card: a choice **How do you want to join?** with **Join a slot** / **Be waitlisted** (the `seg` pattern used for Your level). **Join a slot** is disabled (greyed, struck through, title “All slots are taken”) before start while every slot is taken, so only **Be waitlisted** remains (during play the Queue Master can admit additional players, so the choice stays open); the hint under the choice explains it. Sending a slot request while full is refused by the “server” too (toast / field error “All slots are taken. Join the waitlist instead.”).
- After, the player's **Request sent** card says “You asked to be waitlisted.” and “Your place isn't held until they do.” for a waitlist request.
- After, a waitlisted signed-in player's **Confirmed · waitlist #N** card: while slots are open, “N slots are open. Ask to join from the waitlist and the Queue Master confirms it.” and a primary **Join from waitlist** button (toast “Slot requested”); afterwards “You asked for a slot; the Queue Master confirms it.” with **Cancel request**. When no slot is open the card reads as before.
- After, the Queue Master's request row shows the choice as a bold small line under the meta line: **Asks for a slot**, **Asks to be waitlisted** or **Waitlist #N · asks for a slot**. The primary button follows the choice: **Confirm to waitlist** for Be waitlisted (and, as before, whenever slots are full before start); **Give slot** (prepared) / **Admit player** (live) for a request from the waitlist; otherwise **Confirm guest** / **Confirm**.
- After, confirming a request from the waitlist while slots are full again (before start) refuses with the inline error “Slots are full again. NAME stays on the waitlist.”; during play it admits above the budget like **Admit player**.

## Why
- Owner request, November 11, 2026 (voice call, #706): “a player can request to join, but they can be waitlisted if they want, or they can just join the slot directly.” Decided: “Players cannot join if the slots are full.” and “If the slots are not full and a waitlisted player decides to join, they can join from the waitlist.” Who chooses: the player picks on the request; every request still waits for the Queue Master (owner answer in the implementation brief).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: guest sheet with slots open (Join a slot preselected) / full (Join a slot disabled, Be waitlisted preselected) / choice error; signed-in card open / full; Request sent for a slot / for the waitlist; Confirmed · waitlist #N with slots open (Join from waitlist) / with a slot request pending (Cancel request) / with no slot open; QM row for each of the three choices, prepared and live; the full-again refusal on Give slot.
- Copy: “How do you want to join?”; “Join a slot”; “Be waitlisted”; “All slots are taken” (title); “A slot is yours once the Queue Master confirms. The waitlist keeps your place until a slot opens.”; “All slots are taken, so you join the waitlist. The Queue Master gives slots as they open.”; “Pick Join a slot or Be waitlisted.”; “All slots are taken. Join the waitlist instead.”; “This is a request, not a booking. The Queue Master confirms each guest before giving a slot or a waitlist place.”; “You asked to be waitlisted.”; “Your place isn't held until they do.”; “N slot is open. / N slots are open. Ask to join from the waitlist and the Queue Master confirms it.”; “Join from waitlist”; “Slot requested”; “You asked for a slot; the Queue Master confirms it.”; “All slots are taken. You keep your place on the waitlist.”; “Asks for a slot”; “Asks to be waitlisted”; “Waitlist #N · asks for a slot”; “Give slot”; “Admit player”; “Slots are full again. NAME stays on the waitlist.”; “NAME got a slot from the waitlist · LEVEL”; “NAME is no longer on the waitlist.”.
- Tokens: none (`.seg button:disabled` uses opacity and a strike-through only).
- Known differences: none.

## Reuse plan
- Reuses as is: `choice-group/` (the Join a slot / Be waitlisted choice, like Your level), `notice/`, `button/`.
- Extends: `join-request-form/` — a required `placement` field with the `openSlots` prop that disables Join a slot; `join-request-card/` — `placement` + `onPlacementChange` on the signed-in open/full/active variants, `placement` on `sent`, `onJoinFromWaitlist` / `slotRequestPending` on `confirmed-waitlist`; `join-requests-panel/` — the choice line and the per-choice confirm label, `waitlistPositions` for “Waitlist #N”.
- New: none.
- Shares work with: 2026-11-09-queue-public-signed-in-names-join (the signed-in join card), 2026-11-09-queue-qm-requests-tabs (the Requests panel).

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — “Join requests from the session link”: the choice, the full-slots rule, Join from waitlist and how confirmation honours each choice.
- Database design: docs/database_design/product/queue/modules/sessions-roster.md — `session_join_requests.placement` (`slot` · `waitlist` · `from_waitlist`), migration `20261111000200`.
- Screen docs: docs/screens/product/modules/queue/public-session.md (Q-PUBLIC-JOIN, Join signed in), docs/screens/product/modules/queue/session-setup.md (Requests card › Join tab).
- Decisions: docs/mvp/decisions.md D-2026-11-11-02.

## Real app work
- Built in the same change (#706): `SessionJoinRequest.placement`; `JoinRequestForm`, `JoinRequestCard`, `JoinRequestsPanel` as in the reuse plan; mock store and real mode (`sendJoinRequest`, `joinSessionAsPlayer` with the placement, `confirmJoinRequest` honouring it; Prisma enum + column in `roster.prisma`, migration drafted, not applied).
