-- The Queue app's sync reads: the club summary, one session's sync status and the Session done review.
-- Ports of readClubSyncSummary, readSyncStatus and sessionCompleteness in packages/db/src/queue/sync.ts and of
-- reviewSessionDone in packages/db/src/queue/finalization.ts. Reads only. The TypeScript reads name no order for some of
-- these lists, so the queries name none either: the database answers in its own order, as it does for the TypeScript.

-- Prepared and active sessions of the club (readClubSyncSummary).
-- name: ListQueueClubOpenSessionIDs :many
SELECT id FROM queue_sessions WHERE club_id = @club_id AND state IN ('prepared', 'active');

-- sessionCompleteness: the streams still open or sealed with a prefix that stops short of the seal, the open conflicts and
-- the operations not yet processed, all by session id (no club column is read, as in the TypeScript).
-- name: GetQueueSyncCompleteness :one
SELECT
  (SELECT count(*) FROM device_session_streams s
    WHERE s.session_id = @session_id
      AND (s.state = 'open' OR (s.state = 'sealed' AND s.contiguous_sequence IS DISTINCT FROM s.sealed_final_sequence)))::int AS open_streams,
  (SELECT count(*) FROM sync_conflicts c WHERE c.session_id = @session_id AND c.state = 'open')::int AS open_conflicts,
  (SELECT count(*) FROM sync_operations o WHERE o.session_id = @session_id AND o.state IN ('received', 'waiting'))::int AS pending_operations;

-- The session's streams, oldest enrolment first.
-- name: ListQueueSyncStreams :many
SELECT id, session_id, device_id, generation_no, downloaded_revision, contiguous_sequence, highest_received_sequence,
       sealed_final_sequence, sealed_at, state
FROM device_session_streams
WHERE session_id = @session_id
ORDER BY enrolled_at ASC, id ASC;

-- The open conflicts without their private evidence, oldest first.
-- name: ListQueueSyncOpenConflicts :many
SELECT id, category, detected_at
FROM sync_conflicts
WHERE session_id = @session_id AND state = 'open'
ORDER BY detected_at ASC, id ASC;

-- Session done barriers: matches on court and whether a ranking policy is already in force at the given instant.
-- name: CountQueueActiveMatches :one
SELECT count(*)::int FROM matches WHERE session_id = @session_id AND state = 'active';

-- name: HasQueueEffectiveRankingPolicy :one
SELECT EXISTS (SELECT 1 FROM ranking_policy_versions WHERE effective_at <= @at)::bool;

-- The live roster entries (not released, not No show), for the minimum-games shortfall.
-- name: ListQueueReviewRoster :many
SELECT id, name_snapshot
FROM session_players
WHERE session_id = @session_id AND released_at IS NULL AND no_show_at IS NULL
ORDER BY id;

-- Participations of the session's completed matches that have a completed decision (invalid matches give nothing).
-- name: ListQueueCompletedParticipations :many
SELECT mp.id, mp.session_player_id, mp.match_id, mp.started_with_match, mp.finished_with_match, mp.joined_operation_id,
       mp.left_operation_id, mp.credit_to::text AS credit_to
FROM match_participations mp
JOIN matches m ON m.id = mp.match_id
JOIN match_decisions d ON d.match_id = m.id
WHERE mp.session_id = @session_id AND m.state = 'completed' AND d.kind = 'completed';

-- Live roster entries whose saved player has no ROTRA profile, oldest confirmation first (guest review).
-- name: ListQueueUnresolvedGuestEntries :many
SELECT sp.id, sp.club_player_id, sp.name_snapshot, cp.display_name, cp.nickname
FROM session_players sp
JOIN club_players cp ON cp.id = sp.club_player_id
WHERE sp.session_id = @session_id AND sp.released_at IS NULL AND sp.no_show_at IS NULL AND cp.player_id IS NULL
ORDER BY sp.confirmed_at ASC, sp.id ASC;

-- The club's saved players that have a ROTRA profile (the candidates), then those profiles with their RTR IDs.
-- name: ListQueueProfiledClubPlayers :many
SELECT id, player_id, display_name, nickname
FROM club_players
-- The TypeScript sets no order here (the database's own), so the candidate order is by id, a fixed order.
WHERE club_id = @club_id AND removed_at IS NULL AND player_id IS NOT NULL
ORDER BY id;

-- name: ListQueueReviewProfiles :many
SELECT p.id, p.full_name, p.nickname, p.profile_state, a.rtr_id
FROM players p
LEFT JOIN player_id_allocations a ON a.player_id = p.id
WHERE p.id = ANY(@ids::uuid[]);

-- The Session done status after a lost response (readFinalizationStatus in packages/db/src/queue/finalization.ts): the one
-- finalization of a session, by session id. The club is compared by the caller, as the TypeScript does.
-- name: GetQueueFinalization :one
SELECT session_id, club_id, command_id, state, stage, committed_at, completed_at, failed_stage, failure_code
FROM session_finalizations
WHERE session_id = @session_id;

-- The downstream jobs of a finalization. The TypeScript names no order, so this names none.
-- name: ListQueueFinalizationJobs :many
SELECT kind, status, attempts, last_error_code
FROM projection_jobs
WHERE source_finalization_id = @session_id;
