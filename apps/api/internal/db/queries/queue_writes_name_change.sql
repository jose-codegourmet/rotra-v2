-- Queue writes: the club's name change request (packages/db/src/admin/clubs.ts requestClubNameChange, cancelClubNameChange).

-- name: GetClubNameChangeByCommand :one
SELECT id, club_id, requested_name, requested_at, state, reviewed_at FROM club_name_change_requests WHERE source_command_id = @command_id;

-- name: GetOtherClubByNameKey :one
-- The club that holds this comparison key (clubs.name_key is unique).
SELECT id FROM clubs WHERE name_key = @name_key;

-- name: InsertClubNameChange :one
INSERT INTO club_name_change_requests (id, club_id, requested_name, requested_name_key, requested_at, source_command_id, created_at, updated_at)
VALUES (@id, @club_id, @requested_name, @requested_name_key, @now, @command_id, @now, @now)
RETURNING id, club_id, requested_name, requested_at, state, reviewed_at;

-- name: CancelPendingClubNameChange :execrows
-- cancelClubNameChange: pending becomes cancelled, which frees the one-pending slot (Prisma updateMany stamps updated_at).
UPDATE club_name_change_requests SET state = 'cancelled', revision = revision + 1, updated_at = @now WHERE club_id = @club_id AND state = 'pending';
