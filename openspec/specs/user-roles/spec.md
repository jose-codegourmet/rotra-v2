# User Roles Specification

## Purpose

Documented role model for Players, Club Owners, Que Masters, Quick Umpires, and Admins. Current implemented gates live in `auth-flow`, `admin-auth`, `clubs`, and `queue-session`.

## Status

**Documented product rules** from `docs/business_logic/client_app/02_user_roles.md`. Admin capabilities in that file are labeled future. Do not treat unbuilt permissions as shipped.

## Actors

Player, Club Owner / Host, Que Master, Quick Umpire (guest), Quick Umpire (authenticated), Admin.

## Requirements

### Requirement: Additive per-club roles
All users SHALL start as Players. Elevated roles SHALL be additive and scoped per club unless stated otherwise. A Club Owner of Club A SHALL have no elevated privileges in Club B unless separately granted. The same rule SHALL apply to Que Master.

#### Scenario: Owner in another club
- GIVEN a player who owns Club A
- WHEN they join Club B as a member
- THEN they have only Player capabilities in Club B

### Requirement: Player capabilities
A Player SHALL be able to join and leave clubs, register for Que Sessions, participate in matches, submit post-match reviews and ratings, view own and others' public profiles, and share matches, profiles, and leaderboards.

A Player SHALL NOT create Club or Friendly Que Sessions, modify the Match Queue on sessions they do not host, rate players mid-session, see other players' payment status or host markup, or approve club join requests.

> Sources disagree on session creation: `02_user_roles.md` and `08_queue_session.md` say only Club Owner or Que Master may create sessions. `docs/business_logic.md` still says a Player can create player-organized sessions. Current implemented `queue-session` allows authenticated players to create a Quick Session.

#### Scenario: Player cannot approve joins
- GIVEN a Player who is not the Club Owner
- WHEN a join request is pending
- THEN they cannot approve or reject it

### Requirement: Club Owner capabilities
Club Owner SHALL be granted per club only after an admin-approved `club_applications` row mints `clubs` with that applicant as owner. A player MAY own unlimited clubs, each via its own application. Pending applications not reviewed within 24 hours of last applicant edit SHALL be auto-rejected; the applicant MAY re-apply.

A Club Owner SHALL inherit Player capabilities in their own club and additionally: configure membership, invite, approve/reject joins, remove non-owner members, assign or revoke any number of Que Masters among active members, oversee sessions, view payment and attendance summaries, access Club Statistics, and manage the blacklist.

A Club Owner SHALL NOT assign themselves as Que Master via the system, approve their own club application, or blacklist an Active Member without removing them first.

#### Scenario: Self-assign Que Master blocked
- GIVEN a Club Owner of Club A
- WHEN they attempt to assign themselves as Que Master in Club A
- THEN the system refuses the assignment

### Requirement: Que Master capabilities
Que Master SHALL be assigned by that club's Club Owner and MUST be an active member at assignment. The role MAY be held in multiple clubs. A Que Master SHALL be able to create and host Club and Friendly Que Sessions, manage the Match Queue, update player statuses except Exited (which requires payment confirmation), assign umpires to non-playing participants, track payments, override attendance, finalize matches, rate players after matches, and trigger early exit.

A Que Master SHALL NOT modify club membership settings, approve join requests, assign other Que Masters, or manage sessions of clubs they are not assigned to.

#### Scenario: Revoke on removal
- GIVEN a Que Master who is removed from the club
- WHEN membership ends
- THEN the Que Master role is revoked immediately

### Requirement: Quick Umpire
Que Master SHALL generate a one-time token, URL, and QR scoped to a single match. Guest Quick Umpires SHALL score and submit only. Authenticated Quick Umpires MAY optionally rate 1–5 after the match and SHALL NOT submit text reviews. A person SHALL NOT hold Quick Umpire for multiple matches at once. Token SHALL expire when the score is submitted or the session ends, and SHALL be revocable by the Que Master.

#### Scenario: Guest cannot rate
- GIVEN a guest who opened a Quick Umpire token
- WHEN they submit the final score
- THEN they are not offered a rating prompt

### Requirement: Role changes are audited
All role changes SHALL be logged with timestamp and actor. `02_user_roles.md` marks the Admin role as future; Admin capabilities are specified in `admin-overview` and Current `admin-*` specs.

#### Scenario: Assignment notification
- GIVEN a Club Owner assigns a Que Master
- WHEN the assignment succeeds
- THEN the assigned player is notified

## Source

- `docs/business_logic/client_app/02_user_roles.md`
- `docs/business_logic.md`
