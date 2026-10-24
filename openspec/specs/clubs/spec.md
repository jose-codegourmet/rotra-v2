# Clubs Specification

## Purpose

Client club surfaces in `apps/client`. The implemented product path is **apply to create a club**. Browse, join, profile, and manage pages exist as mock/demo UI. Listing a player's real memberships is implemented as an API consumed by Quick Session, not by the `/clubs` page.

Admin approve/reject of applications is specified in `admin-approvals`.

## Requirements

### Requirement: Club application create and read
An authenticated player SHALL create at most one `pending` club application via `POST /api/club-applications/me`. `GET /api/club-applications/me` SHALL return the pending application, or the most recent rejected application when none is pending. Create MUST persist the application fields and create a `club_application_submitted` notification. A second pending application SHALL return HTTP 409.

#### Scenario: Player submits a first application
- GIVEN a signed-in player with no pending application
- WHEN they post a valid body to `POST /api/club-applications/me`
- THEN a `pending` `club_application` row is created
- AND a `club_application_submitted` notification is created for that player

#### Scenario: Player already has a pending application
- GIVEN a pending application for the player
- WHEN they post another create request
- THEN the API returns HTTP 409

#### Scenario: Unauthenticated create
- GIVEN no current profile (or a mismatched Supabase user)
- WHEN they call the club-application APIs
- THEN the API returns HTTP 401

### Requirement: Pending application update and cancel
`PATCH /api/club-applications/[id]` SHALL update only a `pending` application owned by the current player. `POST /api/club-applications/[id]/cancel` SHALL set a pending application to `cancelled`. Non-pending rows MUST return HTTP 409. Missing rows MUST return HTTP 404. Invalid bodies MUST return HTTP 400.

#### Scenario: Player updates a pending application
- GIVEN the player owns a pending application
- WHEN they PATCH valid fields
- THEN the pending row is updated

#### Scenario: Player cancels a pending application
- GIVEN the player owns a pending application
- WHEN they POST cancel
- THEN the application status becomes `cancelled`

#### Scenario: Cancel after review
- GIVEN the application is no longer `pending`
- WHEN they POST cancel
- THEN the API returns HTTP 409

### Requirement: Apply page uses live application APIs
`/clubs/apply` SHALL load `/api/club-applications/me`, validate with the club-application schema, submit via POST or PATCH, show a pending banner with cancel, and after rejection allow applying again.

#### Scenario: Pending state on apply page
- GIVEN `GET /api/club-applications/me` returns a pending application
- WHEN the player opens `/clubs/apply`
- THEN they see the pending state
- AND they can cancel that application

### Requirement: Membership list API
`GET /api/clubs/mine` SHALL return `{ clubs: [{ id, name }] }` for the current profile's `club_members` rows with `status: active`. This API is used by Quick Session club picking. Approval of an application creates a `clubs` row but does **not** create a `club_members` row, so a newly approved owner MAY be absent from this list.

#### Scenario: Player with active memberships
- GIVEN the current profile has active `club_members` rows
- WHEN they GET `/api/clubs/mine`
- THEN the response lists those clubs' `id` and `name`

#### Scenario: Unauthenticated membership list
- GIVEN no current profile
- WHEN they GET `/api/clubs/mine`
- THEN the API returns HTTP 401

### Requirement: Club directory and profile pages are mock UI
`/clubs` SHALL render the static `MY_CLUBS` list and a CTA to `/clubs/apply`. Discover SHALL link to `/explore`, not `/clubs/explore`. `/clubs/explore` and `/explore` SHALL render `MOCK_CLUBS` with inert Join/View actions. `/clubs/[clubId]` and its overview/members/schedule/rules/announcements tabs SHALL render mock club data. Owner/Que Master demo role (`?as=owner` or `?as=que_master`) SHALL show the operator landing; other roles SHALL redirect to `/overview`.

#### Scenario: Clubs home does not load /api/clubs/mine
- GIVEN a signed-in player
- WHEN they open `/clubs`
- THEN the page shows the hardcoded `MY_CLUBS` list
- AND cards are not linked to `/clubs/[clubId]`

#### Scenario: Demo owner landing
- GIVEN `/clubs/[clubId]?as=owner`
- WHEN the club root page renders
- THEN the owner/QM landing is shown instead of the public overview

### Requirement: Club manage pages are local demo only
`/clubs/[clubId]/manage` SHALL redirect to `/manage/members`. Members, requests, statistics, settings, and blacklist manage pages SHALL not call club mutation APIs. Promote-to-QM, invite toggles, and ProvisionBox actions MUST remain local/placeholder. `/clubs/settings` SHALL be an unscoped mock settings hub (not tied to a club id).

#### Scenario: Manage members promote action
- GIVEN a player on `/clubs/[clubId]/manage/members`
- WHEN they use the promote-to-QM control
- THEN only a client toast/local state change occurs
- AND no club-member API is called

## Documented product rules

The following rules come from `docs/business_logic/client_app/04_club_system.md`. They are product intent and MUST NOT be treated as implemented unless a Current requirement above already states the same fact. Browse/join/manage pages remain mock; application create/approve is Current in this spec and `admin-approvals`.

### Requirement: Club states
Clubs SHALL be Active (sessions and joins allowed), Paused (visible; new sessions and join requests blocked; reversible), or Archived (read-only; no unarchive in MVP; never hard-deleted). Club Owner MAY toggle active ↔ paused. Archiving after demotion SHALL notify all members `club_closed`.

#### Scenario: Paused blocks joins
- GIVEN a club is Paused
- WHEN a player submits a join request
- THEN the request is blocked

### Requirement: Join methods
Players SHALL join via Invite Link/QR (one active link; disable or rotate invalidates the old), Direct Invite (bypasses Auto-Approve; accept/decline), or Request to Join. Auto-Approve ON SHALL immediately activate link/QR and requests. Direct invite acceptance SHALL always create an Active Member. Club names MAY duplicate; identity is `clubs.id`.

> Minted-club default in Current `admin-approvals` is `autoApprove: true`. `00` and `04` settings table document Auto-Approve default OFF. Both are recorded; Current approve behavior wins for what code does now.

#### Scenario: Direct invite bypass
- GIVEN Auto-Approve is OFF
- WHEN a player accepts a Club Owner direct invite
- THEN they become an Active Member without the request queue

### Requirement: Que Master assignment
Only the Club Owner SHALL assign or revoke Que Masters, with no cap, including bulk assign of active members. Revocation SHALL remove session-management immediately; in-progress server state SHALL not roll back. The same player MAY be Que Master in multiple clubs.

#### Scenario: Bulk assign
- GIVEN three active members
- WHEN the Club Owner assigns all three as Que Masters
- THEN all three receive the role in that club

### Requirement: Blacklist
Blacklist SHALL silently block invite link (“This invite is no longer valid.”), join request (“Your request could not be processed.”), and direct invite (control unavailable). Active members MUST be removed first. Un-blacklist SHALL NOT re-add. Per-club only. Actions SHALL be logged with timestamp, actor, and optional internal note. A blacklisted Que Master’s role SHALL be revoked at removal.

#### Scenario: Un-blacklist
- GIVEN a player is removed from the blacklist
- WHEN the action completes
- THEN they are not automatically a member

### Requirement: Club Owner statistics
Statistics SHALL be read-only. Consistent members SHALL default to ≥ 3 sessions in the last 30 days (Club Owner-configurable). Financial aggregates (spent, collected, outstanding, markup “profit”) SHALL be Club Owner only. Que Masters MAY see per-session cost totals but not the aggregate financial view. Markup profit SHALL exclude tax and overhead.

#### Scenario: QM cannot open aggregate financials
- GIVEN a Que Master who is not the Club Owner
- WHEN they try to open aggregate club financials
- THEN access is denied

## Source

- `apps/client/src/app/(protected)/clubs/**`
- `apps/client/src/app/(protected)/explore/page.tsx`
- `apps/client/src/app/api/club-applications/**`
- `apps/client/src/app/api/clubs/mine/route.ts`
- `apps/client/src/hooks/useClubApplication/**`
- `apps/client/src/hooks/useMyClubs.ts`
- `apps/client/src/constants/mock-club.ts`
- `apps/client/src/constants/mock-clubs.ts`
- `apps/client/src/constants/club-demo-role.ts`
- `packages/db/src/club-application-service.ts`
- `packages/db/prisma/models_club.prisma`
