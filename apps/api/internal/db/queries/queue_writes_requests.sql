-- Queue writes (go-writes-queue): join and match requests, the drop-out notices, and the match rows Add to queue and Auto Queue
-- write (packages/db/src/queue/{match-requests,drop-out-notices,match-queue,match-control,match-store}.ts). Prisma stamps updated_at
-- (and created_at) with the application clock, so each statement sets them from @now.

-- name: GetMatchRequestInSession :one
-- openRequestIn: a match request of this session.
SELECT * FROM session_match_requests WHERE id = @id AND session_id = @session_id;

-- name: ListMatchRequestSpots :many
SELECT * FROM session_match_request_spots WHERE request_id = @request_id ORDER BY side, slot_no;

-- name: DecideMatchRequest :exec
-- Add to queue (added, with its match) and Decline (declined): the request closes with the decision and a new revision.
UPDATE session_match_requests
SET status = @status, match_id = sqlc.narg('match_id')::uuid, decided_at = @now, revision = revision + 1, updated_at = @now
WHERE id = @id;

-- name: GetDropOutNoticeInSession :one
-- noticeCommand: a notice of this session, with its roster entry's name and whether the entry was released.
SELECT n.*, e.name_snapshot, e.released_at AS entry_released_at
FROM session_drop_out_notices n
JOIN session_players e ON e.id = n.session_player_id
WHERE n.id = @id AND n.session_id = @session_id;

-- name: CloseDropOutNotice :exec
UPDATE session_drop_out_notices SET status = 'closed', decision = @decision::drop_out_notice_decision, closed_at = @now WHERE id = @id;

-- name: NextQueueMatchNo :one
-- nextMatchNo: the next immutable match number (removed drafts keep theirs).
SELECT (coalesce(max(match_no), 0) + 1)::int4 FROM matches WHERE session_id = @session_id;

-- name: NextQueuePosition :one
-- nextQueuePosition: after every waiting match (removed drafts keep their numbers, not slots).
SELECT (coalesce(max(queue_position), 0) + 1)::bigint FROM matches WHERE session_id = @session_id AND state = 'waiting' AND removed_at IS NULL;

-- name: GetMatchBySourceOperation :one
SELECT * FROM matches WHERE source_operation_id = @source_operation_id;

-- name: InsertQueueMatch :exec
INSERT INTO matches (id, club_id, session_id, match_no, format, queue_position, origin, manual_protected, generation_id, source_operation_id, created_at, updated_at)
VALUES (@id, @club_id, @session_id, @match_no, @format::match_format, @queue_position, @origin::match_origin, @manual_protected, @generation_id, @source_operation_id, @now, @now);

-- name: InsertMatchParticipation :exec
INSERT INTO match_participations (id, club_id, session_id, match_id, session_player_id, team, segment_no, joined_operation_id, joined_at, created_at, updated_at)
VALUES (@id, @club_id, @session_id, @match_id, @session_player_id, @team::team_side, 1, @joined_operation_id, @now, @now, @now);

-- name: PlaceQueueMatchOnCourt :exec
-- putOnCourt: on_court with placed_at, out of the queue.
UPDATE matches SET state = 'on_court', placed_at = @now, queue_position = NULL, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: InsertActiveCourtHold :exec
INSERT INTO active_court_holds (court_id, club_id, session_id, match_id, held_at) VALUES (@court_id, @club_id, @session_id, @match_id, @now);

-- name: GetMatchCourtUsageOfCourt :one
SELECT * FROM match_court_usage WHERE match_id = @match_id AND court_id = @court_id;

-- name: TakeUpMatchCourtUsage :exec
-- A match coming back to a court it used before takes its released row up again.
UPDATE match_court_usage SET acquired_at = @now, acquire_operation_id = @acquire_operation_id, released_at = NULL, release_operation_id = NULL WHERE id = @id;

-- name: InsertMatchCourtUsage :exec
INSERT INTO match_court_usage (id, club_id, session_id, match_id, court_id, acquired_at, acquire_operation_id)
VALUES (@id, @club_id, @session_id, @match_id, @court_id, @now, @acquire_operation_id);

-- name: ListActivePlayerHolds :many
SELECT * FROM active_player_holds WHERE match_id = @match_id;

-- name: DeleteActivePlayerHolds :exec
DELETE FROM active_player_holds WHERE match_id = @match_id AND session_player_id = ANY(@session_player_ids::uuid[]);

-- name: InsertActivePlayerHold :exec
INSERT INTO active_player_holds (session_player_id, club_id, session_id, match_id, player_id, held_at)
VALUES (@session_player_id, @club_id, @session_id, @match_id, @player_id, @now);

-- name: BumpQueueRevision :exec
UPDATE queue_sessions SET queue_revision = queue_revision + 1, updated_at = @now WHERE id = @id;

-- name: SetCourtFillMode :exec
UPDATE queue_sessions SET court_fill_mode = @court_fill_mode::court_fill_mode, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: ListQueueMatchParticipations :many
-- The open and closed segments of a match, for the lineup the player holds follow.
SELECT * FROM match_participations WHERE match_id = @match_id ORDER BY joined_at, id;
