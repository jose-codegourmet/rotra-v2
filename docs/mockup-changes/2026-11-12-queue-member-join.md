# Club members join upcoming sessions right away; Always require a request

Status: IN MOCK APP — #764
Date: 2026-11-12
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Session preparation › Overview › Session link card (linkCard) and Public session page › Want to play? card (joinCard, signed-in member)
Route: /queue/sessions/s-tonight/preparation (Overview) and /queue/sessions/s-tonight/public as “Signed-in player · not in the session”
Screen ID: Q-PREPARE (Session link card), Q-PUBLIC-JOIN
Artifact: none
Components: session-link-card, join-request-card
Supersedes: none
Superseded by: none

## What changed
- Session link card: a second switch, **Always require a request**, directly under **Accept join requests**. Helper when on: “Club members send a join request too, like everyone else.”; when off: “Club members join upcoming sessions right away; guests still send a request.” Off by default. Disabled, and read as off, while Accept join requests is off. Toasts “Members must request now” / “Members can join right away”.
- Public session page, signed-in **club member** (a registered player in this club's saved players) on a prepared session with Accept join requests on and Always require a request off: the Want to play? card reads “You're a member of CLUB, so you get your place right away.” instead of “One tap sends your request and the Queue Master confirms it.”; the button reads **Join as NAME** (Join a slot) or **Join the waitlist as NAME** (Be waitlisted, or every slot taken). The tap writes the roster row (or the waitlist place) at once, no join request; toast “You're in” / “You're on the waitlist”. The My night card then shows them confirmed or waitlisted as if the Queue Master had confirmed them.
- Before → after for everyone else: unchanged. Guests, non-members, members on a live session, and members when the switch is on keep today's request flow and copy.

## Why
- Owner, November 12, 2026 (#764): “whenever a player is already a club member. they should be able to join a upcoming session · on going sessions would be a request still · BY default, guests or non club members should request · But if already member they can join right away · BUT if QM sets the Session to be ALWAYS require a request.. then it should be mandatory · the default is ALLOW members to join upcoming sessions”. Decision [D-2026-11-12-02](../mvp/decisions.md#d-2026-11-12-02).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Session link card — Accept join requests on with Always require a request off (default) and on; Accept join requests off (second switch disabled, reads off). Join card — member with open slots (Join as NAME), member choosing Be waitlisted or every slot taken (Join the waitlist as NAME), member with the setting on (request copy as today), non-member (request copy as today), after the tap (My night card).
- Copy: **Always require a request**; “Club members send a join request too, like everyone else.”; “Club members join upcoming sessions right away; guests still send a request.”; “Members must request now”; “Members can join right away”; “You're a member of CLUB, so you get your place right away.”; **Join as NAME**; **Join the waitlist as NAME**; “You're in”; “You're on the waitlist”.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: switch, button (primary), choice-group
- Extends: session-link-card (alwaysRequireRequest + onAlwaysRequireRequestChange, second switch row); join-request-card (`member` on the signed-in open/full variants: member sentence and Join as NAME / Join the waitlist as NAME)
- New: none
- Shares work with: none

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — Join requests from the session link: club members join upcoming sessions right away; Always require a request
- Database design: docs/database_design/product/queue/modules/sessions-roster.md — `queue_sessions.always_require_request`; a member's direct join writes the same rows as a confirmed request
- Screen docs: docs/screens/product/modules/queue/session-setup.md (Session link card), docs/screens/product/modules/queue/public-session.md (signed-in Join)

## Real app work
- `QueueSession.alwaysRequireRequest` (mock store, Prisma `queue_sessions.always_require_request`, migration `20261112000300_session_always_require_request`), `useSetAlwaysRequireRequest` modelled on `useSetAcceptJoinRequests` (PATCH `/api/sessions/[sessionId]` with `{ alwaysRequireRequest }`); `PublicSessionPage.alwaysRequireRequest`; `PlayerSessionAccess.isClubMember` and `MyNight.isClubMember`; `joinAsPlayer` / `joinSessionAsPlayer` write the roster row or waitlist place directly for a member; SessionLinkCard and JoinRequestCard extended with stories; the Queue public page container and Session preparation wired.
