-- Queue writes (go-writes-queue): the signed-in Player's writes on a public Queue Session (packages/db/src/queue/public-session.ts:
-- join, cancel request, I'm here, I'm leaving, I can't make it, Session invite). Prisma stamps updated_at and created_at with the
-- application clock, so each statement sets them from @now.

-- name: GetSessionOfSlug :one
-- findUnique by publicSlug (no publication check: a removed page still takes these commands, as it does today).
SELECT id, club_id FROM queue_sessions WHERE public_slug = @slug;

-- name: GetClubSelfCheckIn :one
SELECT self_check_in_enabled FROM clubs WHERE id = @id;

-- name: GetOwnLiveEntryOfPlayer :one
-- ownEntry: the signed-in Player's live roster entry (not released, not a no show) in a session.
SELECT sp.id, sp.present
FROM session_players sp
JOIN club_players cp ON cp.club_id = sp.club_id AND cp.id = sp.club_player_id
WHERE sp.session_id = @session_id AND sp.released_at IS NULL AND sp.no_show_at IS NULL AND cp.player_id = @player_id
ORDER BY sp.id LIMIT 1;

-- name: SelfCheckInEntry :exec
UPDATE session_players SET present = true, present_changed_at = @now, self_checked_in_at = @now, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: LeaveEntry :exec
UPDATE session_players SET present = false, present_changed_at = @now, left_at = @now, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: GetOpenDropOutNoticeOfEntry :one
SELECT id FROM session_drop_out_notices WHERE session_player_id = @session_player_id AND status = 'open' LIMIT 1;

-- name: InsertDropOutNotice :exec
INSERT INTO session_drop_out_notices (id, club_id, session_id, session_player_id, player_id, created_at)
VALUES (@id, @club_id, @session_id, @session_player_id, @player_id, @now);

-- name: GetWaitlistEntryOfPlayer :one
SELECT w.id FROM session_waitlist w JOIN club_players cp ON cp.id = w.club_player_id
WHERE w.session_id = @session_id AND cp.player_id = @player_id
ORDER BY w.id LIMIT 1;

-- name: GetSessionInviteCodeOfPlayer :one
SELECT code FROM session_invite_codes WHERE session_id = @session_id AND player_id = @player_id;

-- name: InsertSessionInviteCode :one
INSERT INTO session_invite_codes (id, club_id, session_id, player_id, code, created_at)
VALUES (@id, @club_id, @session_id, @player_id, @code, @now)
RETURNING code;

-- name: GetPendingJoinRequestOfPlayer :one
SELECT id FROM session_join_requests WHERE session_id = @session_id AND player_id = @player_id AND status = 'pending' ORDER BY id LIMIT 1;

-- name: CancelPendingJoinRequest :execrows
-- Guarded on pending, so a request the Queue Master decided meanwhile is never overwritten.
UPDATE session_join_requests SET status = 'cancelled', decided_at = @now, revision = revision + 1, updated_at = @now WHERE id = @id AND status = 'pending';

-- name: CountPendingJoinRequests :one
SELECT count(*)::int4 FROM session_join_requests WHERE session_id = @session_id AND status = 'pending';

-- name: GetLatestClubAssessmentLevel :one
-- memberOf: the latest club assessment of a saved player (its playing level).
SELECT skill_level_id FROM club_assessments WHERE club_id = @club_id AND club_player_id = @club_player_id ORDER BY assessed_at DESC, id DESC LIMIT 1;

-- name: GetLatestLevelOfPlayerInClub :one
-- bandFor: the Player's latest club level on any roster of the club.
SELECT sp.skill_level_id FROM session_players sp JOIN club_players cp ON cp.id = sp.club_player_id
WHERE sp.club_id = @club_id AND sp.skill_level_id IS NOT NULL AND cp.player_id = @player_id
ORDER BY sp.confirmed_at DESC, sp.id DESC LIMIT 1;

-- name: InsertPlayerJoinRequest :exec
-- A signed-in Player's request: the account and the profile's name; no phone (D-2026-11-16-04). invite_code_id stays unset.
INSERT INTO session_join_requests (id, club_id, session_id, player_id, name, nickname, phone_e164, stated_band, placement, club_player_id, requested_at, created_at, updated_at)
VALUES (@id, @club_id, @session_id, @player_id, @name, @nickname, NULL, @stated_band::stated_band, @placement::join_request_placement, @club_player_id, @now, @now, @now);
