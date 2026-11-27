-- The registration claim (go-sign-in 3.2). Ports of readClaimLink, completeClaim and completeRecordClaim in
-- packages/db/src/player/claim.ts. A link is player-keyed (a `players` row: registration staging or a linked
-- unclaimed profile, player_claim_links) or record-keyed (a club's own unclaimed record, club_player_claim_links).
-- Prisma fills updated_at and ids on the client: every INSERT here sets them and every UPDATE sets updated_at
-- from @now. The *Lock queries take the row FOR UPDATE, link first and then the row the claim changes.

-- name: GetPlayerClaimLinkView :one
SELECT l.id AS link_id,
       l.state,
       l.expires_at,
       COALESCE(c.name, 'ROTRA')::text AS club_name,
       p.id AS player_id,
       p.full_name,
       p.nickname,
       p.avatar_ref,
       p.profile_state,
       p.personal_details,
       p.experience_months,
       p.experience_recorded_at,
       a.rtr_id,
       pc.phone_e164 AS contact_phone,
       pc.email AS contact_email,
       (acct.player_id IS NOT NULL)::bool AS has_account
FROM player_claim_links l
LEFT JOIN clubs c ON c.id = l.issuing_club_id
JOIN players p ON p.id = l.player_id
LEFT JOIN player_id_allocations a ON a.player_id = p.id
LEFT JOIN player_private_contacts pc ON pc.player_id = p.id
LEFT JOIN player_accounts acct ON acct.player_id = p.id
WHERE l.token_digest = @token_digest;

-- name: GetClubPlayerClaimLinkView :one
SELECT l.id AS link_id,
       l.club_id,
       l.state,
       l.expires_at,
       c.name AS club_name,
       cp.id AS club_player_id,
       cp.display_name,
       cp.nickname,
       cp.player_id,
       cp.removed_at,
       (pi.club_player_id IS NOT NULL)::bool AS has_input,
       pi.phone_e164 AS input_phone,
       pi.email AS input_email,
       se.email AS shared_entry_email,
       se.id AS shared_entry_id,
       se.rtr_id AS shared_entry_rtr_id,
       cp.avatar_ref
FROM club_player_claim_links l
JOIN club_players cp ON cp.club_id = l.club_id AND cp.id = l.club_player_id
JOIN clubs c ON c.id = cp.club_id
LEFT JOIN club_player_private_inputs pi ON pi.club_player_id = cp.id
LEFT JOIN shared_player_entries se ON se.id = cp.shared_entry_id
WHERE l.token_digest = @token_digest;

-- name: LockPlayerClaimLink :one
SELECT id FROM player_claim_links WHERE token_digest = @token_digest FOR UPDATE;

-- name: LockClubPlayerClaimLink :one
SELECT id FROM club_player_claim_links WHERE token_digest = @token_digest FOR UPDATE;

-- name: LockClubPlayerRow :one
SELECT id FROM club_players WHERE club_id = @club_id AND id = @id FOR UPDATE;

-- The claimed record becomes the player's. Its nickname became the account's, so the club nickname starts empty
-- (D-2026-11-18-03), as in completeRecordClaim; the phone linking of other clubs' records keeps theirs (LinkClubPlayer).
-- name: LinkClaimedClubPlayer :exec
UPDATE club_players
SET player_id = @player_id, nickname = NULL, revision = revision + 1, updated_at = @now
WHERE club_id = @club_id AND id = @id;

-- name: ConsumePlayerClaimLink :exec
UPDATE player_claim_links
SET state = 'consumed', consumed_at = @now, revision = revision + 1, updated_at = @now
WHERE id = @id;

-- name: ConsumeClubPlayerClaimLink :exec
UPDATE club_player_claim_links
SET state = 'consumed', consumed_at = @now, revision = revision + 1, updated_at = @now
WHERE id = @id;

-- name: FindContactPlayerByPhone :one
SELECT player_id FROM player_private_contacts WHERE phone_e164 = @phone;

-- name: FindContactPlayerByEmail :one
SELECT player_id FROM player_private_contacts WHERE email = @email;

-- A new registration: the player row is claimed from the start.
-- name: InsertClaimedPlayer :exec
INSERT INTO players (id, full_name, nickname, profile_state, created_at, updated_at)
VALUES (@id, @full_name, sqlc.narg('nickname'), 'claimed', @now, @now);

-- name: InsertPrivateContact :one
INSERT INTO player_private_contacts (player_id, phone_e164, email, created_at, updated_at)
VALUES (@player_id, @phone, @email, @now, @now)
RETURNING revision;

-- The staged profile already has a contact: the player's email replaces the club's, unverified (completeClaim).
-- name: SetPrivateContactEmail :one
UPDATE player_private_contacts
SET email = @email, email_verified_at = NULL, revision = revision + 1, updated_at = @now
WHERE player_id = @player_id
RETURNING revision;

-- auth_subject is the sign-in identity's id (auth_provider 'rotra').
-- name: InsertPlayerAccount :exec
INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, created_at, updated_at)
VALUES (@player_id, 'rotra', @auth_subject, @now, @contact_sync_version, @now, @now);

-- name: MarkPlayerClaimed :exec
UPDATE players
SET profile_state = 'claimed', revision = revision + 1, updated_at = @now
WHERE id = @id;

-- The identity a player signs in with, and whether its account may: for the retry after a consumed link.
-- name: GetPlayerAccountByPlayerID :one
SELECT auth_subject, disabled_at FROM player_accounts WHERE player_id = @player_id;

-- name: GetPlayerClaimResult :one
SELECT p.full_name, p.nickname, a.rtr_id
FROM players p
LEFT JOIN player_id_allocations a ON a.player_id = p.id
WHERE p.id = @player_id;
