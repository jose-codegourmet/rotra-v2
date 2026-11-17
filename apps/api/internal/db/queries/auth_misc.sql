-- Never store an email, username or password in an event: the table has no column for them.
-- name: InsertAuthEvent :exec
INSERT INTO auth_events (identity_id, session_id, audience, event, ip, device_id, occurred_at)
VALUES (sqlc.narg('identity_id'), sqlc.narg('session_id'), @audience, @event, sqlc.narg('ip')::inet,
        sqlc.narg('device_id'), @at);

-- One statement per attempt; it commits before the sign-in transaction starts (design: rate limits).
-- name: UpsertAuthRateLimit :one
INSERT INTO auth_rate_limits (scope, subject, action, window_start, attempts)
VALUES (@scope, @subject, @action, @window_start, 1)
ON CONFLICT (scope, subject, action, window_start) DO UPDATE SET attempts = auth_rate_limits.attempts + 1
RETURNING attempts;

-- Read only: the sign-in checks wrong-password counts without counting the check itself.
-- name: GetAuthRateLimitAttempts :one
SELECT coalesce(sum(attempts), 0)::integer AS attempts
FROM auth_rate_limits
WHERE scope = @scope AND subject = @subject AND action = @action AND window_start = @window_start;

-- name: DeleteExpiredAuthRateLimits :execrows
DELETE FROM auth_rate_limits WHERE window_start < @before;

-- name: DeleteExpiredAuthRateLimitsForSubject :execrows
DELETE FROM auth_rate_limits WHERE scope = @scope AND subject = @subject AND window_start < @before;

-- Devices (existing table; semantics of registerDevice in packages/db/src/queue/sync.ts).
-- name: GetDeviceByID :one
SELECT * FROM devices WHERE id = @id;

-- name: GetDeviceForClub :one
SELECT * FROM devices WHERE club_id = @club_id AND id = @id;

-- Returns no row when the id already exists (any club): the caller then reads it with GetDeviceByID.
-- name: InsertDeviceIfNew :one
INSERT INTO devices (id, club_id, label, registered_at, created_at, updated_at)
VALUES (@id, @club_id, @label, @now, @now, @now)
ON CONFLICT (id) DO NOTHING
RETURNING *;

-- The first revoke stays.
-- name: RevokeDeviceRow :execrows
UPDATE devices SET revoked_at = @at, updated_at = @at, revision = revision + 1
WHERE club_id = @club_id AND id = @id AND revoked_at IS NULL;
