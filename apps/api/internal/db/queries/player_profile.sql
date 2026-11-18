-- The player's own profile details (go-sign-in 3.2). Port of updateMyProfile in packages/db/src/player/profile.ts.
-- Prisma fills updated_at and the social link id on the client, so Postgres has no defaults for them: the caller
-- passes both. Every timestamp comes from the caller (@now).

-- name: LockPlayerProfile :one
SELECT revision, experience_months, experience_recorded_at
FROM players
WHERE id = @id
FOR UPDATE;

-- details_version is PERSONAL_DETAILS_VERSION (1): the database requires it whenever personal_details is set.
-- name: UpdatePlayerDetails :one
UPDATE players
SET full_name = @full_name,
    nickname = sqlc.narg('nickname'),
    experience_months = sqlc.narg('experience_months'),
    experience_recorded_at = sqlc.narg('experience_recorded_at'),
    personal_details = @personal_details::jsonb,
    details_version = 1,
    revision = revision + 1,
    updated_at = @now
WHERE id = @id
RETURNING revision;

-- name: DeletePlayerSocialLink :exec
DELETE FROM player_social_links
WHERE player_id = @player_id AND provider = @provider;

-- name: UpsertPlayerSocialLink :exec
INSERT INTO player_social_links (id, player_id, provider, url, created_at, updated_at)
VALUES (@id, @player_id, @provider, @url, @now, @now)
ON CONFLICT (player_id, provider) DO UPDATE SET url = EXCLUDED.url, updated_at = EXCLUDED.updated_at;
