-- Admin writes of clubs and licenses (internal/adminwrites). Ports of packages/db/src/admin/clubs.ts and
-- licenses.ts. Every write runs in one transaction. Prisma stamps created and updated times with the application
-- clock, so every time here is a parameter.

-- ---- license terms (admin/licenses.ts activateLicense, refreshEntitlement) ----

-- name: LockClubForWrite :one
-- lockClub: the club row for the transaction (SELECT ... FOR UPDATE), which serializes price, license and name
-- changes per club, with the columns activateLicense reads from it.
SELECT id, name, name_key, license_pricing, license_monthly_minor, license_yearly_minor, currency
FROM clubs WHERE id = $1 FOR UPDATE;

-- name: GetClubLicenseTermByCommand :one
-- The term a command already recorded (repeat-safe on the command).
SELECT id, club_id, plan, starts_at, ends_at, activated_at, pricing_at_activation, paid_on, amount_minor, currency,
       payment_reference, notes
FROM club_license_terms WHERE source_command_id = $1;

-- name: GetClubEntitlement :one
SELECT effective_term_id, effective_access_ends_at FROM club_entitlements WHERE club_id = $1;

-- name: CountClubLicenseTerms :one
-- nextPaymentReference counts every club's terms.
SELECT count(*) FROM club_license_terms;

-- name: InsertClubLicenseTerm :exec
INSERT INTO club_license_terms (id, club_id, plan, starts_at, ends_at, activated_by_admin_id, activated_at, source_command_id,
  pricing_at_activation, paid_on, amount_minor, currency, payment_reference, notes, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $7);

-- name: GetClubLicenseTermByID :one
SELECT id, club_id, plan, starts_at, ends_at, activated_at, pricing_at_activation, paid_on, amount_minor, currency,
       payment_reference, notes
FROM club_license_terms WHERE id = $1;

-- name: CancelRunningExpiryCycles :exec
-- Renewal cancels the exact running cycle, so a queued deletion for it exits (F07.32).
UPDATE club_expiry_cycles
SET state = 'cancelled', cancelled_at = $2, cancellation_term_id = $3, revision = revision + 1, updated_at = $2
WHERE club_id = $1 AND state = 'running';

-- name: LatestStartedLicenseTerm :one
-- refreshEntitlement: the term that has started at $2 with the latest end. The id breaks a tie in the end.
SELECT id, ends_at FROM club_license_terms
WHERE club_id = $1 AND starts_at <= $2
ORDER BY ends_at DESC, id ASC LIMIT 1;

-- name: GetRunningExpiryCycle :one
SELECT id FROM club_expiry_cycles WHERE club_id = $1 AND state = 'running' ORDER BY id LIMIT 1;

-- name: InsertExpiryCycle :exec
INSERT INTO club_expiry_cycles (id, club_id, expired_at, delete_public_pages_after, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $5);

-- name: RetainPublicationsUnderCycle :exec
-- Puts a club's live public pages under its running cycle, so deletion can name it exactly.
UPDATE session_publications
SET expiry_cycle_id = $2, revision = revision + 1, updated_at = $3
WHERE club_id = $1 AND state <> 'deleted';

-- name: UpsertClubEntitlement :exec
-- A club's access projection: the term covering now with the latest end. A new row starts at revision 1; an
-- existing one counts the refresh.
INSERT INTO club_entitlements (club_id, effective_term_id, effective_access_ends_at, current_expiry_cycle_id, refreshed_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $5)
ON CONFLICT (club_id) DO UPDATE
SET effective_term_id = EXCLUDED.effective_term_id, effective_access_ends_at = EXCLUDED.effective_access_ends_at,
    current_expiry_cycle_id = EXCLUDED.current_expiry_cycle_id, refreshed_at = EXCLUDED.refreshed_at,
    updated_at = EXCLUDED.updated_at, revision = club_entitlements.revision + 1;

-- ---- club name review (admin/clubs.ts readAdminClubDirectory narrowed to one club, reviewClubNameChange) ----

-- name: GetClubName :one
SELECT name FROM clubs WHERE id = $1;

-- name: GetPendingClubNameRequest :one
-- The club's pending name change request: the newest by requested time, the id breaking a tie (readAdminClubDirectory).
-- There is one pending request per club (partial unique in SQL).
SELECT id, requested_name FROM club_name_change_requests
WHERE club_id = $1 AND state = 'pending'
ORDER BY requested_at DESC, id ASC LIMIT 1;

-- name: GetClubNameChangeRequest :one
SELECT id, club_id, requested_name, requested_name_key, state FROM club_name_change_requests WHERE id = $1;

-- name: GetClubIDByNameKey :one
SELECT id FROM clubs WHERE name_key = $1;

-- name: SetClubName :exec
UPDATE clubs SET name = $2, name_key = $3, revision = revision + 1, updated_at = $4 WHERE id = $1;

-- name: DecideClubNameChange :exec
UPDATE club_name_change_requests
SET state = $2, reviewed_by_admin_id = $3, reviewed_at = $4, revision = revision + 1, updated_at = $4
WHERE id = $1;

-- ---- Add club (admin/clubs.ts stageClub, provisionClubAccount) ----

-- name: FindLocationCode :one
-- findLocationCode: the founding city of a code such as PH-CEB.
SELECT id FROM location_codes WHERE country_code = $1 AND city_code = $2;

-- name: GetClubBySourceCommand :one
-- The club an Add club command already made (repeat-safe on the command).
SELECT id, name FROM clubs WHERE source_command_id = $1;

-- name: GetClubAccountForProvision :one
SELECT username, provisioned_at FROM club_accounts WHERE club_id = $1;

-- name: InsertClub :exec
-- A new club: its price, a Free club storing no paid amounts. Prisma stamps created and updated times with the
-- application clock ($11).
INSERT INTO clubs (id, name, name_key, founding_location_code_id, founding_address, license_pricing,
  license_monthly_minor, license_yearly_minor, source_command_id, invite_code, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11);

-- name: InsertClubAccount :exec
-- The staged club account: no sign-in yet (auth_subject and provisioned_at are set by ProvisionClubAccount).
INSERT INTO club_accounts (club_id, username, auth_provider, created_at, updated_at)
VALUES ($1, $2, $3, $4, $4);

-- name: InsertClubEntitlement :exec
INSERT INTO club_entitlements (club_id, refreshed_at, updated_at) VALUES ($1, $2, $2);

-- name: ProvisionClubAccount :exec
-- The club's sign-in exists: the account points at its identity and counts the change.
UPDATE club_accounts
SET auth_subject = $2, provisioned_at = $3, revision = revision + 1, updated_at = $3
WHERE club_id = $1;
