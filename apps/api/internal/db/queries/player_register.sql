-- Guest registration (go-writes-admin-player 6b). Ports of guestRegistrationClub, stageRegistration, adoptEntryAllocation
-- and claimSharedEntry in packages/db/src/player/{guest-registration,shared-entry}.ts. Prisma fills updated_at on the client:
-- every INSERT and UPDATE here sets it from @now. The advisory-lock keys are the TypeScript's, so a Go and a Next.js
-- write of one phone, email or attempt queue.

-- name: LockRegistrationKey :exec
SELECT pg_advisory_xact_lock(hashtext(@key::text));

-- name: GetSessionForRegistration :one
-- The session link's page: its club, title and slug, and the state of its publication ('' when it has none).
SELECT s.club_id, s.title, s.public_slug, COALESCE(p.state::text, '') AS publication_state
FROM queue_sessions s
LEFT JOIN session_publications p ON p.session_id = s.id
WHERE s.public_slug = @slug;

-- name: GetClubInviteName :one
-- requireClubInvite: the club whose current code this is, with its name.
SELECT id, name FROM clubs WHERE id = @id AND invite_code = @code LIMIT 1;

-- name: GetStagedRegistration :one
-- stageRegistration's `previous`: the staging link of an attempt and the contact of the player it made.
SELECT l.issuing_club_id, c.phone_e164 AS contact_phone, c.email AS contact_email
FROM player_claim_links l
JOIN players p ON p.id = l.player_id
LEFT JOIN player_private_contacts c ON c.player_id = p.id
WHERE l.token_digest = @token_digest;

-- name: ContactHoldsPhoneOrEmail :one
-- findFirst of stageRegistration: any contact, claimed or not, with this phone or this email.
SELECT EXISTS (SELECT 1 FROM player_private_contacts WHERE phone_e164 = @phone OR email = @email)::bool AS held;

-- name: LoginKeyReserved :one
-- Replaces the provider's auth.users check: a sign-in (a Player's email, a club's or an admin's login) already has this key.
SELECT EXISTS (SELECT 1 FROM auth_identities WHERE login_key = @login_key)::bool AS held;

-- name: InsertUnclaimedPlayer :exec
INSERT INTO players (id, full_name, nickname, created_at, updated_at)
VALUES (@id, @full_name, sqlc.narg('nickname'), @now, @now);

-- name: InsertPlayerClaimLink :exec
-- The staging link: a registration's own, keyed on the digest of "registration:<attempt>".
INSERT INTO player_claim_links (id, player_id, issuing_club_id, token_digest, state, issued_at, expires_at, created_at, updated_at)
VALUES (@id, @player_id, @club_id, @token_digest, 'active', @now, @expires_at, @now, @now);

-- name: GetOpenSharedEntryByEmail :one
-- openEntryByEmail: the open (not claimed, not retired) shared entry for this email.
SELECT id, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence
FROM shared_player_entries
WHERE email = @email AND claimed_player_id IS NULL AND retired_at IS NULL;

-- name: GetAllocationPlayerByRtrID :one
SELECT player_id FROM player_id_allocations WHERE rtr_id = @rtr_id;

-- name: InsertAdoptedAllocation :exec
-- adoptEntryAllocation: the allocation copies the shared entry's RTR ID (allocated_at is the column default).
INSERT INTO player_id_allocations (player_id, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence)
VALUES (@player_id, @rtr_id, @creating_club_id, @location_code_id, @country_code, @city_code, @sync_date::date, @sequence);

-- name: GetSharedEntryClaimedBy :one
SELECT id FROM shared_player_entries WHERE claimed_player_id = @player_id;

-- name: ListSharedEntryRecords :many
-- The current club records pointing to an entry, oldest first.
SELECT id, club_id, player_id FROM club_players WHERE shared_entry_id = @entry_id AND removed_at IS NULL ORDER BY added_at ASC, id ASC;

-- name: MarkSharedEntryClaimed :exec
UPDATE shared_player_entries
SET claimed_player_id = @player_id, claimed_at = @now, email = NULL, revision = revision + 1, updated_at = @now
WHERE id = @id;

-- name: LinkSharedEntryRecord :exec
-- The club's nickname for an unclaimed person was their nickname, not a club nickname: it is cleared.
UPDATE club_players SET player_id = @player_id, nickname = NULL, revision = revision + 1, updated_at = @now
WHERE club_id = @club_id AND id = @id;

-- name: ListClubNamesByID :many
-- Ordered by name; the id is the tiebreaker the TypeScript's orderBy name lacks.
SELECT name FROM clubs WHERE id = ANY(@ids::uuid[]) ORDER BY name ASC, id ASC;
