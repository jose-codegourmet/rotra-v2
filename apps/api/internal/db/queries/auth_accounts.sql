-- Read-only lookups of the account rows an identity is linked to: auth_provider = 'rotra' and
-- auth_subject = auth_identities.id. All three tables have a unique (auth_provider, auth_subject).
-- A club account's primary key is club_id and a player account's is player_id; only admin_accounts has its own id.

-- name: GetClubAccountBySubject :one
SELECT club_id, username, provisioned_at, disabled_at
FROM club_accounts
WHERE auth_provider = 'rotra' AND auth_subject = @subject;

-- name: GetPlayerAccountBySubject :one
SELECT player_id, disabled_at
FROM player_accounts
WHERE auth_provider = 'rotra' AND auth_subject = @subject;

-- name: GetAdminAccountBySubject :one
SELECT id, display_name, active
FROM admin_accounts
WHERE auth_provider = 'rotra' AND auth_subject = @subject;

-- name: GetClubNameByID :one
SELECT name FROM clubs WHERE id = @id;

-- name: GetPlayerFullNameByID :one
SELECT full_name FROM players WHERE id = @id;
