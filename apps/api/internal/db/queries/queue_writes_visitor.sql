-- Queue writes (go-writes-queue): the Queue visitor routes (packages/db/src/queue/public-session.ts sendJoinRequest, readMyJoinRequest).

-- name: GetVisitorJoinRequest :one
-- A request with the slug of its session (findUnique with the session's publicSlug included).
SELECT r.id, r.session_id, r.name, r.status::text AS status, r.placement::text AS placement, r.club_player_id, s.public_slug
FROM session_join_requests r JOIN queue_sessions s ON s.id = r.session_id
WHERE r.id = @id;

-- name: InsertVisitorJoinRequest :exec
-- A guest's request carries no phone since D-2026-11-16-04, and no account.
INSERT INTO session_join_requests (id, club_id, session_id, name, nickname, phone_e164, stated_band, placement, requested_at, created_at, updated_at)
VALUES (@id, @club_id, @session_id, @name, @nickname, NULL, @stated_band::stated_band, @placement::join_request_placement, @now, @now, @now);
