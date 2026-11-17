-- Sign-in tables (go-sign-in 1.2, design: docs/database_design/product/sign-in.md). Every timestamp comes from
-- the caller (@now / @at), never now(), so the grace window and the tests stay deterministic.

-- name: GetAuthIdentityByLogin :one
SELECT * FROM auth_identities WHERE audience = @audience AND login_key = @login_key;

-- name: GetAuthIdentityByID :one
SELECT * FROM auth_identities WHERE id = @id;

-- name: InsertAuthIdentity :one
INSERT INTO auth_identities (id, audience, login_key, password_hash, password_scheme, password_changed_at, created_at, updated_at)
VALUES (@id, @audience, @login_key, @password_hash, @password_scheme, @now, @now, @now)
RETURNING *;

-- name: UpdateAuthIdentityPassword :execrows
UPDATE auth_identities
SET password_hash = @password_hash, password_scheme = @password_scheme,
    password_changed_at = @now, updated_at = @now, revision = revision + 1
WHERE id = @id;

-- name: SetAuthIdentityDisabled :execrows
UPDATE auth_identities
SET disabled_at = sqlc.narg('disabled_at'), updated_at = @now, revision = revision + 1
WHERE id = @id;

-- name: ChangeAuthIdentityLoginKey :execrows
UPDATE auth_identities
SET login_key = @login_key, updated_at = @now, revision = revision + 1
WHERE id = @id;
