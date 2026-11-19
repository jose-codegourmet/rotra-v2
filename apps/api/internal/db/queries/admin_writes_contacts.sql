-- The Admin contact-change writes (packages/db/src/player/contact-change.ts). Prisma stamps updated_at (@updatedAt) and the
-- times of a request with the application clock, so every time here is a parameter.

-- name: LockContactRequest :one
-- lockRequest: the row lock every decision and every step of an application takes first.
SELECT id FROM player_contact_change_requests WHERE id = $1 FOR UPDATE;

-- name: GetContactRequest :one
SELECT * FROM player_contact_change_requests WHERE id = $1;

-- name: GetContactRequestByCommand :one
-- A repeat of a command: the request it made.
SELECT * FROM player_contact_change_requests WHERE source_command_id = $1;

-- name: InsertOwnerContactRequest :one
-- The owner enters a request for a player (submit, source owner): pending, revision 1, no attempts.
INSERT INTO player_contact_change_requests (id, player_id, field, source, proposed_value, original_value, original_contact_revision,
                                            requested_at, submitted_by_admin_id, source_command_id, updated_at)
VALUES (@id, @player_id, @field::contact_change_field, 'owner', @proposed, sqlc.narg('original'), @original_revision,
        @now, @admin_id, @command_id, @now)
RETURNING *;

-- name: RejectContactRequest :one
-- reviewContactChange, reject: the player keeps the current contact.
UPDATE player_contact_change_requests
SET status = 'rejected', reviewed_by_admin_id = @admin_id, reviewed_at = @now, rejected_at = @now, resolution_note = NULL,
    revision = revision + 1, updated_at = @now
WHERE id = @id
RETURNING *;

-- name: ApproveContactRequest :one
-- reviewContactChange, approve: reserves the value (the partial unique indexes) and the provider operation; no contact changes.
UPDATE player_contact_change_requests
SET status = 'approved', reviewed_by_admin_id = @admin_id, reviewed_at = @now, approved_at = @now,
    provider_operation_ref = @operation_ref, resolution_note = NULL, revision = revision + 1, updated_at = @now
WHERE id = @id
RETURNING *;

-- name: StageContactApplication :one
-- applyContactChange, stage one: applying, the attempt counted.
UPDATE player_contact_change_requests
SET status = 'applying', application_attempts = application_attempts + 1, last_attempt_at = @now, failure_code = NULL,
    revision = revision + 1, updated_at = @now
WHERE id = @id
RETURNING *;

-- name: FailContactRequest :one
-- markFailed: failed with a code, retryable.
UPDATE player_contact_change_requests
SET status = 'failed', failure_code = @failure_code, revision = revision + 1, updated_at = @now
WHERE id = @id
RETURNING *;

-- name: ApplyContactRequest :one
-- reconcileContactChange, the settle: applied (the provider time is kept when it was set).
UPDATE player_contact_change_requests
SET status = 'applied', provider_applied_at = COALESCE(provider_applied_at, @now), applied_at = @now, failure_code = NULL,
    revision = revision + 1, updated_at = @now
WHERE id = @id
RETURNING *;

-- name: FindReservedEmailEdit :one
-- An Admin email edit of another player that is waiting for the same email.
SELECT id FROM admin_player_email_edits
WHERE proposed_email = @email AND state = 'pending' AND player_id <> @player_id
LIMIT 1;

-- name: LockReservedEmail :exec
-- pg_advisory_xact_lock(hashtextextended(key, 0)): serializes an approval with an Admin email edit of the same address. The key
-- is the TypeScript's, so a Go and a Next.js write queue.
SELECT pg_advisory_xact_lock(hashtextextended(@key::text, 0));
