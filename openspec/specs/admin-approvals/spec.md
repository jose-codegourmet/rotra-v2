# Admin Approvals Specification

## Purpose

Admin review of club owner applications. Approving creates a `clubs` row. Rejecting uses a fixed reason enum. The demotions page is an explicit placeholder.

## Requirements

### Requirement: Approvals index
`/approvals` SHALL redirect to `/approvals/club-applications`.

#### Scenario: Open approvals root
- GIVEN a signed-in active admin
- WHEN they request `/approvals`
- THEN they are redirected to `/approvals/club-applications`

### Requirement: List club applications
`GET /api/club-applications` SHALL require an admin session and return a paginated list filterable by status, sort, and optional `playerId`.

#### Scenario: Admin lists pending applications
- GIVEN pending club applications exist
- WHEN they GET `/api/club-applications` with a pending status filter
- THEN those applications are returned

### Requirement: Approve creates a club
`POST /api/club-applications/[id]/approve` SHALL succeed only when status is `pending` or `in_review`. It MUST create a `clubs` row (`ownerId` = applicant, generated invite token, `autoApprove: true`, `inviteLinkEnabled: true`), set the application to `approved` with `resultingClubId`, notify the applicant (`club_application_approved`), and write `admin_action_log`. It does not create a `club_members` row. Wrong status SHALL be 409. Missing id SHALL be 404.

#### Scenario: Approve a pending application
- GIVEN a pending application
- WHEN an admin POSTs approve
- THEN a club is created
- AND the application becomes `approved`
- AND the applicant receives a notification

#### Scenario: Approve after already decided
- GIVEN an application that is not `pending` or `in_review`
- WHEN they POST approve
- THEN the API returns HTTP 409

### Requirement: Reject and bulk reject
`POST /api/club-applications/[id]/reject` SHALL require a rejection-reason enum and optional note, only for `pending` or `in_review`. `POST /api/club-applications/bulk-reject` SHALL reject multiple pending/in-review applications the same way.

#### Scenario: Reject with reason
- GIVEN a pending application
- WHEN an admin POSTs reject with a valid reason
- THEN the application is rejected
- AND the applicant is notified

### Requirement: Name collisions and CSV
`GET /api/club-applications/[id]/name-collisions` SHALL return read-only name-collision hints. CSV export SHALL be generated client-side from already-loaded rows only.

#### Scenario: Name collision check
- GIVEN an application id
- WHEN the admin requests name-collisions
- THEN the API returns collision data without mutating the application

### Requirement: SLA helper
`POST /api/cron/club-applications-sla` SHALL require an admin session and auto-reject pending applications whose `updatedAt` is older than 24 hours (`rejectionReason: other`, system SLA note, notification). It is not a secret-keyed headless cron.

#### Scenario: Stale pending application
- GIVEN a pending application last updated more than 24 hours ago
- WHEN an admin POSTs the SLA helper
- THEN that application is rejected with the SLA note

### Requirement: Demotions page is a placeholder
`/approvals/demotions` SHALL render placeholder copy that the demotion queue is not shipped. It MUST NOT list or mutate demotion records.

#### Scenario: Open demotions
- GIVEN a signed-in admin
- WHEN they open `/approvals/demotions`
- THEN only placeholder text is shown

## Documented product rules

The following rules come from `docs/business_logic/admin_app/04_approvals_and_moderation.md`. They are product intent and MUST NOT be treated as implemented unless a Current requirement above already states the same fact. Current club-application approve/reject/SLA helper is implemented; demotions remain a placeholder; moderation queue is mock (`admin-platform`).

### Requirement: Complaints and demotions
Complaints SHALL be distinct from `moderation_flags`. Only members of the relevant club MAY file. Complainants SHALL NOT receive resolution notifications. Escalation MAY create `club_demotion_requests`. Demotion/transfer SHALL affect one club at a time. After ownership transfer, the former owner SHALL remain an active member with role `member`.

#### Scenario: Complaint has no resolution ping
- GIVEN a member filed a complaint
- WHEN an admin resolves it
- THEN the complainant is not notified of the outcome

### Requirement: Account actions (documented)
Documented moderation account actions: Warn; Suspend temporary (reversible); Suspend permanent (reversible by Super Admin only); Delete account (irreversible; PII removed; match records anonymized). Suspended players SHALL be logged out immediately. A suspended Club Owner’s clubs SHALL remain active for a configurable grace period (default 7 days). Content-policy categories for review removal are documented in `04_approvals_and_moderation.md`.

#### Scenario: Temporary suspend
- GIVEN an admin issues a temporary suspension
- WHEN it takes effect
- THEN the player cannot log in until lifted or the period ends

## Source

- `apps/admin/src/app/(protected)/approvals/page.tsx`
- `apps/admin/src/app/(protected)/approvals/club-applications/page.tsx`
- `apps/admin/src/app/(protected)/approvals/demotions/page.tsx`
- `apps/admin/src/app/api/club-applications/**`
- `apps/admin/src/hooks/useClubApplications/**`
- `apps/admin/src/components/modules/club-applications/**`
- `packages/db/src/club-application-service.ts`
