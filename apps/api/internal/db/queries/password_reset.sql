-- Admin-reviewed player password recovery (go-sign-in 3.4). Ports of the Prisma calls in
-- packages/db/src/admin/password-resets.ts. The table has no defaults for id and updated_at (Prisma filled them in
-- the client), so every insert and update sets them from @now. token_digest is the SHA-256 of the Go-issued token.

-- The account of the player whose private contact has this email (submitPasswordResetRequest). The identity is
-- the sign-in the account's auth_subject points at; identity_usable is false when it is missing, not a player's or
-- disabled.
-- name: GetResetAccountByEmail :one
SELECT c.player_id, c.email, a.auth_provider, a.auth_subject, a.disabled_at AS account_disabled_at,
       a.contact_sync_status,
       (i.id IS NOT NULL AND i.audience = 'player' AND i.disabled_at IS NULL)::bool AS identity_usable
FROM player_private_contacts c
JOIN player_accounts a ON a.player_id = c.player_id
LEFT JOIN auth_identities i ON i.id = a.auth_subject
WHERE c.email = @email;

-- One unresolved submission per normalized address: the partial unique index makes a repeat or a simultaneous
-- request a no-op.
-- name: InsertResetRequest :exec
INSERT INTO player_password_reset_requests (id, email, player_id, requested_at, created_at, updated_at)
VALUES (@id, @email, sqlc.narg('player_id'), @now, @now, @now)
ON CONFLICT (email) WHERE status = 'pending' DO NOTHING;

-- name: CountResetRequests :one
SELECT count(*) FROM player_password_reset_requests;

-- name: ListResetRequests :many
SELECT r.id, r.email, r.status, r.requested_at, r.reviewed_at, ad.display_name AS reviewed_by_name,
       r.player_id, p.full_name AS player_name, al.rtr_id,
       pc.email AS contact_email, pa.auth_provider, pa.auth_subject, pa.disabled_at AS account_disabled_at,
       pa.contact_sync_status,
       (i.id IS NOT NULL AND i.audience = 'player' AND i.disabled_at IS NULL)::bool AS identity_usable
FROM player_password_reset_requests r
LEFT JOIN admin_accounts ad ON ad.id = r.reviewed_by_admin_id
LEFT JOIN players p ON p.id = r.player_id
LEFT JOIN player_id_allocations al ON al.player_id = r.player_id
LEFT JOIN player_private_contacts pc ON pc.player_id = r.player_id
LEFT JOIN player_accounts pa ON pa.player_id = r.player_id
LEFT JOIN auth_identities i ON i.id = pa.auth_subject
ORDER BY r.requested_at DESC, r.id DESC
LIMIT 25 OFFSET @page_offset;

-- One request with what eligibility and the checks of an issue or a consume need.
-- name: GetResetRequest :one
SELECT r.id, r.email, r.status, r.player_id, r.reviewed_at, r.auth_subject AS request_subject, r.token_digest,
       r.consumed_at,
       pc.email AS contact_email, pa.auth_provider, pa.auth_subject, pa.disabled_at AS account_disabled_at,
       pa.contact_sync_status,
       (i.id IS NOT NULL AND i.audience = 'player' AND i.disabled_at IS NULL)::bool AS identity_usable
FROM player_password_reset_requests r
LEFT JOIN player_private_contacts pc ON pc.player_id = r.player_id
LEFT JOIN player_accounts pa ON pa.player_id = r.player_id
LEFT JOIN auth_identities i ON i.id = pa.auth_subject
WHERE r.id = @id;

-- name: GetResetRequestPlayer :one
SELECT player_id FROM player_password_reset_requests WHERE id = @id;

-- name: FindResetRequestByDigest :one
SELECT id, player_id FROM player_password_reset_requests WHERE token_digest = @digest;

-- Lock order for every writer: the player row, then the request row.
-- name: LockResetPlayer :one
SELECT id FROM players WHERE id = @id FOR UPDATE;

-- name: LockResetRequest :one
SELECT id FROM player_password_reset_requests WHERE id = @id FOR UPDATE;

-- name: DeclineResetRequest :exec
UPDATE player_password_reset_requests
SET status = 'declined', reviewed_by_admin_id = @admin_id, reviewed_at = @now,
    issuance_id = NULL, issuance_started_at = NULL, revision = revision + 1, updated_at = @now
WHERE id = @id;

-- Revokes every earlier link of the player (and any lease a TypeScript issuance left behind).
-- name: RevokePlayerResetLinks :exec
UPDATE player_password_reset_requests
SET token_digest = NULL, issuance_id = NULL, issuance_started_at = NULL, revision = revision + 1, updated_at = @now
WHERE player_id = @player_id AND (token_digest IS NOT NULL OR issuance_id IS NOT NULL);

-- name: IssueResetRequest :execrows
UPDATE player_password_reset_requests
SET status = 'issued', reviewed_by_admin_id = @admin_id, reviewed_at = @now, auth_subject = @auth_subject,
    token_digest = @digest, consumed_at = NULL, issuance_id = NULL, issuance_started_at = NULL,
    revision = revision + 1, updated_at = @now
WHERE id = @id;

-- Single use: only a row still holding the digest and not consumed is burned.
-- name: BurnResetToken :execrows
UPDATE player_password_reset_requests
SET token_digest = NULL, consumed_at = @now, revision = revision + 1, updated_at = @now
WHERE id = @id AND token_digest = @digest AND consumed_at IS NULL;

-- name: InsertAdminAudit :exec
INSERT INTO admin_audit_events (id, actor_admin_id, action, target_type, target_id, occurred_at)
VALUES (@id, @actor_admin_id, @action, @target_type, @target_id, @now);
