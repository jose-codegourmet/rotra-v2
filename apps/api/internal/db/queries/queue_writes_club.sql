-- Queue writes (go-writes-queue), the club, its venues and its saved players: packages/db/src/admin/{club-invite,clubs}.ts,
-- queue/{club-players,club-player-move,club-player-delete}.ts and player/claim.ts. Prisma stamps updated_at on every create and
-- update (updateMany too), so each statement takes @now.

-- name: RegenerateClubInviteCode :execrows
-- writeInviteCode (not only if missing): updateMany sets the new code and bumps the club revision.
UPDATE clubs SET invite_code = @code, revision = revision + 1, updated_at = @now WHERE id = @club_id;

-- name: LockClub :one
-- lockClub: the club row, locked for the transaction. No row is not found.
SELECT id, revision FROM clubs WHERE id = @id FOR UPDATE;

-- name: UpdateClubSettings :one
-- updateClubSettings: only the fields the caller sent change (the set_ flags); the revision bumps.
UPDATE clubs
SET post_template = CASE WHEN @set_post_template::boolean THEN sqlc.narg('post_template')::text ELSE post_template END,
    description = CASE WHEN @set_description::boolean THEN sqlc.narg('description')::text ELSE description END,
    court_rules = CASE WHEN @set_court_rules::boolean THEN sqlc.narg('court_rules')::text ELSE court_rules END,
    self_check_in_enabled = CASE WHEN @set_self_check_in::boolean THEN @self_check_in_enabled::boolean ELSE self_check_in_enabled END,
    revision = revision + 1, updated_at = @now
WHERE id = @id
RETURNING id, name, logo_ref, default_players_per_court, default_entrance_fee_minor, currency, description, court_rules, post_template,
          self_check_in_enabled, revision;

-- name: GetClubVenueByID :one
SELECT * FROM club_venues WHERE id = @id;

-- name: InsertClubVenue :one
INSERT INTO club_venues (id, club_id, name, address, court_fee_per_court_hour_minor, entrance_fee_minor, created_at, updated_at)
VALUES (@id, @club_id, @name, @address, @court_fee_per_court_hour_minor, @entrance_fee_minor, @now, @now)
RETURNING *;

-- name: UpdateClubVenue :one
UPDATE club_venues
SET name = @name, address = @address, court_fee_per_court_hour_minor = @court_fee_per_court_hour_minor,
    entrance_fee_minor = @entrance_fee_minor, revision = revision + 1, updated_at = @now
WHERE id = @id
RETURNING *;

-- name: GetSavedPlayerForNickname :one
SELECT cp.id, cp.nickname, p.full_name AS player_full_name, p.profile_state AS player_profile_state
FROM club_players cp LEFT JOIN players p ON p.id = cp.player_id
WHERE cp.id = @id AND cp.club_id = @club_id AND cp.removed_at IS NULL;

-- name: SetClubPlayerNickname :exec
UPDATE club_players SET nickname = @nickname, revision = revision + 1, updated_at = @now WHERE club_id = @club_id AND id = @id;

-- name: FindSavedPlayerByPhone :one
-- addNewSavedPlayer: a saved player of this club with this number, on file as the club's private input or as the player's contact.
-- The TypeScript has no order; the id is the tiebreaker here.
SELECT cp.display_name FROM club_players cp
WHERE cp.club_id = @club_id AND cp.removed_at IS NULL
  AND (EXISTS (SELECT 1 FROM club_player_private_inputs i WHERE i.club_player_id = cp.id AND i.phone_e164 = @phone)
    OR EXISTS (SELECT 1 FROM player_private_contacts c WHERE c.player_id = cp.player_id AND c.phone_e164 = @phone))
ORDER BY cp.id LIMIT 1;

-- name: ListSavedPlayersForMove :many
SELECT cp.id, cp.player_id, cp.shared_entry_id, cp.display_name, p.full_name AS player_full_name
FROM club_players cp LEFT JOIN players p ON p.id = cp.player_id
WHERE cp.club_id = @club_id AND cp.removed_at IS NULL AND cp.id = ANY(@ids::uuid[])
ORDER BY cp.id;

-- name: ListMovableEntries :many
-- Every roster row of the saved player in a prepared or running session, released ones too.
SELECT sp.id, sp.session_id, sp.released_at
FROM session_players sp JOIN queue_sessions s ON s.id = sp.session_id
WHERE sp.club_id = @club_id AND sp.club_player_id = @club_player_id AND s.state IN ('prepared', 'active')
ORDER BY sp.id;

-- name: HasSessionEntry :one
-- The target already has a roster row (released or not) in the session.
SELECT EXISTS (SELECT 1 FROM session_players sp WHERE sp.club_id = @club_id AND sp.club_player_id = @club_player_id AND sp.session_id = @session_id);

-- name: MoveSessionPlayerTo :exec
-- A live entry takes the other record's name; a released one keeps its own.
UPDATE session_players
SET club_player_id = @target, name_snapshot = CASE WHEN released_at IS NULL THEN @name ELSE name_snapshot END,
    revision = revision + 1, updated_at = @now
WHERE id = @id;

-- name: ListWaitlistOfClubPlayer :many
SELECT id, session_id FROM session_waitlist WHERE club_id = @club_id AND club_player_id = @club_player_id ORDER BY id;

-- name: IsWaitingOrLive :one
-- The person already holds a place in the session: a waitlist spot or a live roster slot.
SELECT EXISTS (SELECT 1 FROM session_waitlist w WHERE w.session_id = @session_id AND w.club_player_id = @club_player_id)
    OR EXISTS (SELECT 1 FROM session_players sp WHERE sp.session_id = @session_id AND sp.club_player_id = @club_player_id AND sp.released_at IS NULL AND sp.no_show_at IS NULL);

-- name: MoveWaitlistEntryTo :exec
UPDATE session_waitlist SET club_player_id = @target, updated_at = @now WHERE id = @id;

-- name: MovePendingJoinRequests :exec
UPDATE session_join_requests SET club_player_id = @target, revision = revision + 1, updated_at = @now
WHERE club_id = @club_id AND club_player_id = @moved AND status = 'pending';

-- name: RevokeClubPlayerClaimLinks :exec
UPDATE club_player_claim_links SET state = 'revoked', revoked_at = @now, revision = revision + 1, updated_at = @now
WHERE club_id = @club_id AND club_player_id = @club_player_id AND state = 'active';

-- name: HideMovedClubPlayer :exec
UPDATE club_players SET removed_at = @now, linked_to_club_player_id = @target, revision = revision + 1, updated_at = @now
WHERE club_id = @club_id AND id = @id;

-- name: ReleasePreparedEntriesOfClubPlayer :exec
-- deleteClubPlayer: the saved player's live slots in prepared sessions are released (reason removed).
UPDATE session_players SET released_at = @now, release_reason = 'removed', revision = revision + 1, updated_at = @now
WHERE session_players.club_id = @club_id AND session_players.club_player_id = @club_player_id AND released_at IS NULL AND no_show_at IS NULL
  AND session_id IN (SELECT id FROM queue_sessions WHERE state = 'prepared');

-- name: DeleteWaitlistOfClubPlayer :exec
DELETE FROM session_waitlist
WHERE session_waitlist.club_id = @club_id AND session_waitlist.club_player_id = @club_player_id
  AND session_id IN (SELECT id FROM queue_sessions WHERE state IN ('prepared', 'active'));

-- name: SoftDeleteSavedPlayer :exec
UPDATE club_players SET removed_at = @now, revision = revision + 1, updated_at = @now WHERE club_id = @club_id AND id = @id;

-- name: GetSharedEntryState :one
SELECT claimed_player_id, retired_at FROM shared_player_entries WHERE id = @id;

-- name: CountLiveRecordsOfEntry :one
SELECT count(*)::int4 FROM club_players WHERE shared_entry_id = @entry_id AND removed_at IS NULL;

-- name: RetireSharedEntry :exec
-- retireEntryIfOrphan: the entry is retired and the mistyped email cleared; the RTR ID is never reused.
UPDATE shared_player_entries SET retired_at = @now, email = NULL, social_key = NULL, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: GetSavedPlayerForLink :one
SELECT cp.id, cp.removed_at, p.id AS player_id, p.profile_state AS player_profile_state
FROM club_players cp LEFT JOIN players p ON p.id = cp.player_id
WHERE cp.club_id = @club_id AND cp.id = @id;

-- name: RevokePlayerClaimLinks :exec
UPDATE player_claim_links SET state = 'revoked', revoked_at = @now, revision = revision + 1, updated_at = @now
WHERE player_id = @player_id AND state = 'active';

-- name: InsertIssuedPlayerClaimLink :exec
INSERT INTO player_claim_links (id, player_id, issuing_club_id, token_digest, issued_at, expires_at, created_at, updated_at)
VALUES (@id, @player_id, @club_id, @token_digest, @now, @expires_at, @now, @now);

-- name: InsertClubPlayerClaimLink :exec
INSERT INTO club_player_claim_links (id, club_id, club_player_id, token_digest, issued_at, expires_at, created_at, updated_at)
VALUES (@id, @club_id, @club_player_id, @token_digest, @now, @expires_at, @now, @now);
