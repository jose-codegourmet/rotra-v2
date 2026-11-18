-- name: InsertAuthSession :one
INSERT INTO auth_sessions (id, identity_id, audience, club_id, device_id, device_label, refresh_digest,
                           created_ip, last_ip, last_seen_at, expires_at, created_at)
VALUES (@id, @identity_id, @audience, sqlc.narg('club_id'), sqlc.narg('device_id'), @device_label, @refresh_digest,
        sqlc.narg('created_ip')::inet, sqlc.narg('created_ip')::inet, @now, @expires_at, @now)
RETURNING *;

-- name: GetAuthSession :one
SELECT * FROM auth_sessions WHERE id = @id;

-- Refresh takes this row lock first, so two refreshes of one session run one after the other.
-- name: GetAuthSessionForUpdate :one
SELECT * FROM auth_sessions WHERE id = @id FOR UPDATE;

-- name: FindAuthSessionByRefreshDigest :one
SELECT * FROM auth_sessions WHERE refresh_digest = @digest;

-- name: FindAuthSessionByPreviousDigest :one
SELECT * FROM auth_sessions WHERE previous_refresh_digest = @digest;

-- The current digest becomes the previous one (B-29 grace window). Only an active session rotates.
-- A null expires_at or ip keeps the stored value.
-- name: RotateAuthSessionRefresh :execrows
UPDATE auth_sessions
SET previous_refresh_digest = refresh_digest,
    refresh_digest = @new_digest,
    refreshed_at = @now,
    last_seen_at = @now,
    expires_at = coalesce(sqlc.narg('expires_at')::timestamptz, expires_at),
    last_ip = coalesce(sqlc.narg('ip')::inet, last_ip)
WHERE id = @id AND revoked_at IS NULL;

-- Writes only when last_seen_at is older than @stale_before (the caller passes now minus a minute).
-- name: TouchAuthSession :execrows
UPDATE auth_sessions
SET last_seen_at = @now, last_ip = coalesce(sqlc.narg('ip')::inet, last_ip)
WHERE id = @id AND revoked_at IS NULL AND last_seen_at < @stale_before;

-- Idempotent: the first revoke (time and reason) stays.
-- name: RevokeAuthSession :execrows
UPDATE auth_sessions SET revoked_at = @at, revoke_reason = @reason
WHERE id = @id AND revoked_at IS NULL;

-- name: RevokeAuthSessionsByIdentity :many
UPDATE auth_sessions SET revoked_at = @at, revoke_reason = @reason
WHERE identity_id = @identity_id AND revoked_at IS NULL
  AND (sqlc.narg('except_id')::uuid IS NULL OR id <> sqlc.narg('except_id')::uuid)
RETURNING id;

-- name: RevokeAuthSessionsByDevice :many
UPDATE auth_sessions SET revoked_at = @at, revoke_reason = @reason
WHERE club_id = @club_id AND device_id = @device_id AND revoked_at IS NULL
RETURNING id;

-- Newest activity first, the order of the partial index auth_sessions_identity_active.
-- name: ListActiveAuthSessionsByIdentity :many
SELECT * FROM auth_sessions
WHERE identity_id = @identity_id AND revoked_at IS NULL AND expires_at > @now
ORDER BY last_seen_at DESC, id;

-- The owner's and Admin's device list: active club sessions with their device.
-- name: ListActiveAuthSessionsByClub :many
SELECT sqlc.embed(s), d.label AS device_current_label, d.revoked_at AS device_revoked_at
FROM auth_sessions s
LEFT JOIN devices d ON d.club_id = s.club_id AND d.id = s.device_id
WHERE s.club_id = @club_id AND s.revoked_at IS NULL AND s.expires_at > @now
ORDER BY s.last_seen_at DESC, s.id;

-- "Revoke all sessions" (B-47): one statement revokes every active session and writes one session_revoked
-- event for each, so the audit trail stays complete without a round trip per session. Returns how many.
-- name: RevokeAllAuthSessions :execrows
WITH revoked AS (
  UPDATE auth_sessions SET revoked_at = @at, revoke_reason = @reason
  WHERE revoked_at IS NULL
  RETURNING id, identity_id, audience, device_id
)
INSERT INTO auth_events (identity_id, session_id, audience, event, device_id, occurred_at)
SELECT identity_id, id, audience, 'session_revoked', device_id, @at FROM revoked;
