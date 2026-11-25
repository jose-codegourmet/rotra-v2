-- The club's trusted hosts and a Queue Session's hosts (D-2026-11-22-01).
-- Ports of packages/db/src/queue/{club-hosts,session-hosts,session-host-snapshots}.ts.

-- name: ListQueueTrustedHosts :many
-- listTrustedHosts: the current rows of a saved player who is still the club's own (not deleted, not moved), oldest first.
SELECT t.id, t.club_player_id, t.added_at
FROM club_trusted_hosts t
JOIN club_players p ON p.id = t.club_player_id
WHERE t.club_id = @club_id AND t.removed_at IS NULL AND p.removed_at IS NULL
ORDER BY t.added_at ASC, t.id ASC;

-- name: GetQueueHostPlayer :one
-- The saved player a host command names, with the ROTRA full name of a linked record. removed_at is the caller's to read: the
-- trusted-host commands need a current player, the Session host commands do not.
SELECT p.id, p.display_name, p.player_id, p.removed_at, pl.full_name
FROM club_players p
LEFT JOIN players pl ON pl.id = p.player_id
WHERE p.club_id = @club_id AND p.id = @id;

-- name: GetQueueCurrentTrustedHost :one
SELECT id FROM club_trusted_hosts WHERE club_id = @club_id AND club_player_id = @club_player_id AND removed_at IS NULL;

-- name: InsertQueueTrustedHost :one
INSERT INTO club_trusted_hosts (id, club_id, club_player_id, added_at, created_at, updated_at)
VALUES (@id, @club_id, @club_player_id, @now, @now, @now)
RETURNING id, club_player_id, added_at;

-- name: EndQueueTrustedHost :execrows
-- removeTrustedHost: ends the current row (updateMany stamps updated_at).
UPDATE club_trusted_hosts SET removed_at = @now, revision = revision + 1, updated_at = @now
WHERE club_id = @club_id AND club_player_id = @club_player_id AND removed_at IS NULL;

-- name: GetQueueSessionStateOfClub :one
SELECT id, state FROM queue_sessions WHERE club_id = @club_id AND id = @id;

-- name: ListQueueSessionHosts :many
-- listSessionHosts: a finished session shows the rows frozen when it ended, any other the current rows.
SELECT id, club_player_id, assigned_at, name_snapshot
FROM session_hosts
WHERE club_id = @club_id AND session_id = @session_id
  AND CASE WHEN @ended::bool THEN frozen_at IS NOT NULL ELSE removed_at IS NULL END
ORDER BY assigned_at ASC, id ASC;

-- name: ListQueueCurrentHostPlayers :many
SELECT club_player_id FROM session_hosts WHERE club_id = @club_id AND session_id = @session_id AND removed_at IS NULL;

-- name: IsQueueClubPlayerTrusted :one
SELECT EXISTS (SELECT 1 FROM club_trusted_hosts WHERE club_id = @club_id AND club_player_id = @club_player_id AND removed_at IS NULL);

-- name: InsertQueueSessionHost :exec
INSERT INTO session_hosts (id, club_id, session_id, club_player_id, assigned_at, name_snapshot, created_at, updated_at)
VALUES (@id, @club_id, @session_id, @club_player_id, @at, @name_snapshot, @now, @now);

-- name: EndQueueSessionHost :execrows
UPDATE session_hosts SET removed_at = @now, revision = revision + 1, updated_at = @now
WHERE club_id = @club_id AND session_id = @session_id AND club_player_id = @club_player_id AND removed_at IS NULL;

-- name: GetQueueLatestAssessmentLevel :one
-- The latest saved level of a saved player (assessedAt, then id, newest first).
SELECT skill_level_id FROM club_assessments WHERE club_id = @club_id AND club_player_id = @club_player_id
ORDER BY assessed_at DESC, id DESC LIMIT 1;

-- name: HasQueueAssessment :one
SELECT EXISTS (SELECT 1 FROM club_assessments WHERE club_id = @club_id AND club_player_id = @club_player_id);

-- name: ReactivateHostSessionPlayer :exec
-- A host with no saved level who has a released or No show entry: the same row comes back with no level set.
UPDATE session_players
SET released_at = NULL, release_reason = NULL, no_show_at = NULL, confirmed_at = @at, present = false, present_changed_at = @at,
    over_budget_at = NULL, revision = revision + 1, updated_at = @now
WHERE id = @id;
