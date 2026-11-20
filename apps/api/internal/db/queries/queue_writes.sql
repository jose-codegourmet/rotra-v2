-- Queue writes (go-writes-queue): the session lock and the roster commands of packages/db/src/queue/session-roster.ts and
-- session-store.ts. Prisma fills @updatedAt on the client on every create and update, so each statement here sets
-- updated_at from @now, and so does created_at: Prisma stamps @default(now()) with the application clock too.

-- name: LockQueueSession :one
-- lockSession: the club's session row, locked for the rest of the transaction (FOR UPDATE). No row is another club's or an
-- unknown id. The columns are listed (not *) because request_formats is read as text[]: pgx cannot scan an array of an enum.
SELECT id, club_id, title, notes, scheduled_start_at, scheduled_end_at, venue_id, venue_name, venue_address, state, invalid_reason,
       cancelled_at, cancel_reason, session_mode, allow_singles, allow_doubles, minimum_games, minimum_is_calculated, players_per_court,
       expected_players, queue_revision, started_at, finalized_at, series_id, start_license_term_id, public_slug, accept_join_requests,
       always_require_request, court_fill_mode, record_games, request_formats::text[] AS request_formats, source_command_id,
       created_at, updated_at, revision
FROM queue_sessions WHERE club_id = @club_id AND id = @id FOR UPDATE;

-- name: GetQueueSession :one
-- The session as it is now, with the columns of LockQueueSession (a write reads its session again after it changed it).
SELECT id, club_id, title, notes, scheduled_start_at, scheduled_end_at, venue_id, venue_name, venue_address, state, invalid_reason,
       cancelled_at, cancel_reason, session_mode, allow_singles, allow_doubles, minimum_games, minimum_is_calculated, players_per_court,
       expected_players, queue_revision, started_at, finalized_at, series_id, start_license_term_id, public_slug, accept_join_requests,
       always_require_request, court_fill_mode, record_games, request_formats::text[] AS request_formats, source_command_id,
       created_at, updated_at, revision
FROM queue_sessions WHERE id = @id;

-- name: TouchQueueSession :exec
-- touchSession: bumps the session revision after any change to it or its roster, courts or waitlist.
UPDATE queue_sessions SET revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: SetQueueSessionMinimum :exec
UPDATE queue_sessions SET minimum_games = @minimum_games, updated_at = @now WHERE id = @id;

-- name: CountQueueLiveCourts :one
SELECT count(*)::int4 FROM session_courts WHERE session_id = @session_id AND removed_at IS NULL;

-- name: CountQueueLiveRoster :one
-- The live roster: not released and not marked No show (cancelled) (LIVE_ENTRY).
SELECT count(*)::int4 FROM session_players WHERE session_id = @session_id AND released_at IS NULL AND no_show_at IS NULL;

-- name: CloseStaleQueueMatchRequests :execrows
-- closeStaleMatchRequests: every open request naming someone who is not present on the live roster (the requester or any
-- picked spot; an Anyone spot names nobody) becomes closed. updateMany sets updated_at.
UPDATE session_match_requests r
SET status = 'closed', decided_at = @now, revision = r.revision + 1, updated_at = @now
WHERE r.session_id = @session_id AND r.status = 'open'
  AND (
    NOT EXISTS (SELECT 1 FROM session_players p WHERE p.id = r.session_player_id AND p.session_id = r.session_id
                AND p.released_at IS NULL AND p.no_show_at IS NULL AND p.present)
    OR EXISTS (SELECT 1 FROM session_match_request_spots s
               WHERE s.request_id = r.id AND s.session_player_id IS NOT NULL
                 AND NOT EXISTS (SELECT 1 FROM session_players p WHERE p.id = s.session_player_id AND p.session_id = r.session_id
                                 AND p.released_at IS NULL AND p.no_show_at IS NULL AND p.present))
  );

-- name: GetClubAssessmentByOperation :one
SELECT * FROM club_assessments WHERE source_operation_id = @operation_id;

-- name: GetSessionPlayer :one
SELECT * FROM session_players WHERE id = @id;

-- name: GetSessionPlayerOfClubPlayer :one
SELECT * FROM session_players WHERE session_id = @session_id AND club_player_id = @club_player_id;

-- name: GetSessionWaitlistEntryOfClubPlayer :one
SELECT * FROM session_waitlist WHERE session_id = @session_id AND club_player_id = @club_player_id;

-- name: InsertSessionWaitlistEntry :one
INSERT INTO session_waitlist (id, club_id, session_id, club_player_id, skill_level_id, added_at, created_at, updated_at)
VALUES (@id, @club_id, @session_id, @club_player_id, @skill_level_id, @added_at, @now, @now)
RETURNING *;

-- name: SetSessionWaitlistLevel :one
UPDATE session_waitlist SET skill_level_id = @skill_level_id, updated_at = @now WHERE id = @id RETURNING *;

-- name: DeleteSessionWaitlistEntry :exec
DELETE FROM session_waitlist WHERE id = @id;

-- name: GetQueueClubPlayerOfClub :one
-- clubPlayer.findUnique({ clubId_id }).
SELECT * FROM club_players WHERE club_id = @club_id AND id = @id;

-- name: InsertSessionPlayer :one
-- sessionPlayer.create for an admission (promoteWaiter): the level, assessment and release columns start empty.
INSERT INTO session_players (id, club_id, session_id, club_player_id, player_id_at_entry, name_snapshot, present, present_changed_at,
                             confirmed_at, joined_at, over_budget_at, created_at, updated_at)
VALUES (@id, @club_id, @session_id, @club_player_id, @player_id_at_entry, @name_snapshot, @present, @now,
        @now, @now, @over_budget_at, @now, @now)
RETURNING *;

-- name: ReactivateSessionPlayer :one
-- promoteWaiter on a released entry: the same row comes back (keeping its paid marks and assessments).
UPDATE session_players
SET released_at = NULL, release_reason = NULL, confirmed_at = @now, present = @present, present_changed_at = @now,
    over_budget_at = @over_budget_at, revision = revision + 1, updated_at = @now
WHERE id = @id RETURNING *;

-- name: InsertClubAssessment :one
INSERT INTO club_assessments (id, club_id, club_player_id, session_id, session_player_id, player_id_at_assessment, skill_level_id,
                              supersedes_id, source_operation_id, assessed_at, received_at, accepted_revision, actor_club_id)
VALUES (@id, @club_id, @club_player_id, @session_id, @session_player_id, @player_id_at_assessment, @skill_level_id,
        @supersedes_id, @source_operation_id, @now, @now, @accepted_revision, @club_id)
RETURNING *;

-- name: SelectSessionPlayerAssessment :exec
UPDATE session_players SET assessment_id = @assessment_id, skill_level_id = @skill_level_id, revision = revision + 1, updated_at = @now
WHERE id = @id;

-- name: LockSessionPlayerLevel :exec
UPDATE session_players SET level_locked_at = @now, updated_at = @now WHERE id = @id;

-- name: InsertSessionNotification :exec
-- writePlayerNotifications for one event: a guest or unclaimed profile (no account) has no inbox, and a repeat of the same
-- source writes nothing (createMany skipDuplicates). created_at is the application clock like every Prisma default.
INSERT INTO player_notifications (id, player_id, kind, title, body, target, source_type, source_id, created_at)
SELECT @id, a.player_id, @kind::player_notification_kind, @title, @body, @target, @source_type, @source_id, @now
FROM player_accounts a
WHERE a.player_id = @player_id
ON CONFLICT DO NOTHING;

-- name: ReleaseSessionPlayer :exec
-- removeRosterPlayerIn: a prepared entry is released (reason removed); the row, its assessments and paid marks stay.
UPDATE session_players SET released_at = @now, release_reason = 'removed', revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: GetQueueJoinRequestForUpdate :one
-- pendingRequest: the request with its Player's picture and name seed (a guest's has no Player).
SELECT r.*, p.avatar_ref, p.full_name AS player_full_name
FROM session_join_requests r
LEFT JOIN players p ON p.id = r.player_id
WHERE r.id = @id;

-- name: DecideQueueJoinRequest :exec
UPDATE session_join_requests
SET status = @status, decided_at = @now, decided_by_device_id = @decided_by_device_id,
    club_player_id = COALESCE(sqlc.narg('club_player_id')::uuid, club_player_id), revision = revision + 1, updated_at = @now
WHERE id = @id;

-- name: GetClubPlayerOfPlayer :one
-- clubPlayer.findFirst({ clubId, playerId }), any row, removed or not.
SELECT * FROM club_players WHERE club_id = @club_id AND player_id = @player_id ORDER BY id LIMIT 1;

-- name: GetClubPlayerOfSharedEntry :one
SELECT * FROM club_players WHERE club_id = @club_id AND shared_entry_id = @shared_entry_id ORDER BY id LIMIT 1;

-- name: RestoreClubPlayer :execrows
-- clubPlayerForProfile: a deleted saved player is restored rather than duplicated; the guarded write restores once.
UPDATE club_players
SET removed_at = NULL, linked_to_club_player_id = NULL,
    display_name = CASE WHEN @set_name::bool THEN @display_name::text ELSE display_name END,
    revision = revision + 1, updated_at = @now
WHERE club_id = @club_id AND id = @id AND removed_at IS NOT NULL;

-- name: InsertProfileClubPlayer :exec
-- clubPlayerForProfile: the club's record of a registered player or of an unclaimed person's shared entry.
INSERT INTO club_players (id, club_id, player_id, shared_entry_id, display_name, added_at, created_at, updated_at)
VALUES (@id, @club_id, @player_id, @shared_entry_id, @display_name, @now, @now, @now);

-- name: GetDirectoryPlayerForRoster :one
-- clubPlayerForProfile: a registered (claimed) player with an RTR ID allocation, or no row.
SELECT p.full_name, p.profile_state, (a.player_id IS NOT NULL)::bool AS has_allocation
FROM players p LEFT JOIN player_id_allocations a ON a.player_id = p.id
WHERE p.id = @id;

-- name: GetOpenSharedEntryByID :one
SELECT id FROM shared_player_entries WHERE id = @entry_id AND claimed_player_id IS NULL AND retired_at IS NULL;

-- name: InsertSharedPlayerEntry :exec
-- createSharedEntry: the entry and its RTR ID. allocated_at is passed (the TypeScript sets it).
INSERT INTO shared_player_entries (id, email, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence,
                                   allocated_at, created_at, updated_at)
VALUES (@id, @email, @rtr_id, @creating_club_id, @location_code_id, @country_code, @city_code, @sync_date::date, @sequence, @allocated_at, @now, @now);

-- name: GetSavedRecordForPerson :one
-- savedRecordFor: the club's current saved record that already is this person, with the account's name (a registered
-- player) or none. Either @player_id or @entry_id is set; the registered form matches player_id, the unclaimed form the
-- entry with no player. @except_id is the record being edited (or the nil UUID for none).
SELECT cp.id, cp.display_name, p.full_name AS player_full_name
FROM club_players cp LEFT JOIN players p ON p.id = cp.player_id
WHERE cp.club_id = @club_id AND cp.removed_at IS NULL
  AND (sqlc.narg('except_id')::uuid IS NULL OR cp.id <> sqlc.narg('except_id')::uuid)
  AND ((sqlc.narg('player_id')::uuid IS NOT NULL AND cp.player_id = sqlc.narg('player_id')::uuid)
    OR (sqlc.narg('entry_id')::uuid IS NOT NULL AND cp.shared_entry_id = sqlc.narg('entry_id')::uuid AND cp.player_id IS NULL))
ORDER BY cp.id LIMIT 1;

-- name: FindClubPlayerClash :one
-- pointRecordAt: another record of this club (removed or not) that already holds the same person.
SELECT id FROM club_players
WHERE club_id = @club_id AND id <> @club_player_id
  AND ((sqlc.narg('player_id')::uuid IS NOT NULL AND player_id = sqlc.narg('player_id')::uuid)
    OR (sqlc.narg('entry_id')::uuid IS NOT NULL AND shared_entry_id = sqlc.narg('entry_id')::uuid))
ORDER BY id LIMIT 1;

-- name: ClearClubPlayerPerson :exec
-- pointRecordAt: the clashing record gives up the person (player or entry).
UPDATE club_players
SET player_id = CASE WHEN @clear_player::bool THEN NULL ELSE player_id END,
    shared_entry_id = CASE WHEN @clear_player::bool THEN shared_entry_id ELSE NULL END,
    revision = revision + 1, updated_at = @now
WHERE club_id = @club_id AND id = @id;

-- name: PointClubPlayerAtPerson :exec
-- pointRecordAt: a registered player's row keeps no copied nickname; an unclaimed person's keeps the club's.
UPDATE club_players
SET player_id = CASE WHEN @registered::bool THEN @player_id::uuid ELSE player_id END,
    nickname = CASE WHEN @registered::bool THEN NULL ELSE nickname END,
    shared_entry_id = CASE WHEN @registered::bool THEN shared_entry_id ELSE @entry_id::uuid END,
    revision = revision + 1, updated_at = @now
WHERE club_id = @club_id AND id = @id;

-- name: GetClubPlayerByID :one
SELECT * FROM club_players WHERE id = @id;

-- name: InsertGuestClubPlayer :exec
-- createClubPlayer: the club's own record, no global player and no shared entry yet.
INSERT INTO club_players (id, club_id, display_name, nickname, added_at, created_at, updated_at)
VALUES (@id, @club_id, @display_name, @nickname, @now, @now, @now);

-- name: InsertGuestPrivateInput :exec
INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, captured_at, created_at, updated_at)
VALUES (@club_player_id, @club_id, @phone, @now, @now, @now);

-- name: GetRosterNames :one
-- rosterNamesOf for one saved player: the club's nickname, and the account's nickname and state of a registered one.
SELECT cp.nickname AS club_nickname, p.nickname AS player_nickname, p.profile_state
FROM club_players cp LEFT JOIN players p ON p.id = cp.player_id
WHERE cp.id = @id;
