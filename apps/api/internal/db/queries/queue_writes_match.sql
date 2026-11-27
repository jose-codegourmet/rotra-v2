-- Queue writes (go-writes-queue): match control and the queue (packages/db/src/queue/match-control.ts, match-queue.ts, match-store.ts).
-- Prisma stamps @updatedAt on every create and update, updateMany too, so each statement sets updated_at from @now.

-- name: GetQueueMatch :one
-- loadMatch: a match of the session, removed drafts too.
SELECT * FROM matches WHERE id = @id AND session_id = @session_id;

-- name: ListMatchCourtHolds :many
SELECT * FROM active_court_holds WHERE match_id = @match_id ORDER BY court_id;

-- name: ListMatchCourtUsages :many
SELECT * FROM match_court_usage WHERE match_id = @match_id ORDER BY acquired_at, id;

-- name: GetMatchDecision :one
SELECT * FROM match_decisions WHERE match_id = @match_id;

-- name: StartPlacedMatch :exec
UPDATE matches SET state = 'active', started_at = @now, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: StartWaitingMatch :exec
-- The older one-step start: placed and started at once.
UPDATE matches SET state = 'active', placed_at = @now, started_at = @now, queue_position = NULL, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: MarkMatchSegmentsStarted :exec
UPDATE match_participations SET started_with_match = true, updated_at = @now WHERE match_id = @match_id AND left_at IS NULL;

-- name: ReleaseMatchCourtUsage :exec
-- releaseCourts: every open usage of the match closes with this operation.
UPDATE match_court_usage SET released_at = @now, release_operation_id = @release_operation_id WHERE match_id = @match_id AND released_at IS NULL;

-- name: DeleteMatchCourtHolds :exec
DELETE FROM active_court_holds WHERE match_id = @match_id;

-- name: DeleteMatchPlayerHolds :exec
DELETE FROM active_player_holds WHERE match_id = @match_id;

-- name: UnplaceMatch :exec
UPDATE matches SET state = 'waiting', placed_at = NULL, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: ListWaitingMatchIDs :many
-- The waiting matches in queue order (queue position, then the number, which is unique).
SELECT id FROM matches WHERE session_id = @session_id AND state = 'waiting' AND removed_at IS NULL ORDER BY queue_position, match_no;

-- name: SetMatchQueuePosition :exec
UPDATE matches SET queue_position = @queue_position, updated_at = @now WHERE id = @id;

-- name: BumpMatchRevision :exec
UPDATE matches SET revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: SetMatchQueuePositionOf :exec
-- Swap with the queue: the match that goes back takes the other's place.
UPDATE matches AS target SET queue_position = (SELECT m.queue_position FROM matches m WHERE m.id = @other_id), updated_at = @now WHERE target.id = @id;

-- name: HandOverMatchSegment :exec
-- Replace player on a Playing match: the open segment goes to the incoming player in place.
UPDATE match_participations SET session_player_id = @session_player_id, segment_no = @segment_no, updated_at = @now WHERE id = @id;

-- name: DeleteMatchParticipation :exec
DELETE FROM match_participations WHERE id = @id;

-- name: DeleteMatchParticipations :exec
DELETE FROM match_participations WHERE match_id = @match_id;

-- name: InsertMatchSegment :exec
INSERT INTO match_participations (id, club_id, session_id, match_id, session_player_id, team, segment_no, joined_operation_id, joined_at, credit_to, created_at, updated_at)
VALUES (@id, @club_id, @session_id, @match_id, @session_player_id, @team::team_side, @segment_no, @joined_operation_id, @now, @credit_to::substitution_credit, @now, @now);

-- name: MakeMatchManual :exec
-- An edited match becomes manual and protected.
UPDATE matches SET origin = 'manual', manual_protected = true, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: SetWaitingMatchLineup :exec
UPDATE matches SET format = @format::match_format, origin = 'manual', manual_protected = true, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: CloseMatchSegment :exec
UPDATE match_participations SET left_at = @now, left_operation_id = @left_operation_id, updated_at = @now WHERE id = @id;

-- name: ClearSegmentCredits :exec
UPDATE match_participations SET credit_to = 'none', updated_at = @now WHERE id = ANY(@ids::uuid[]);

-- name: DeleteActivePlayerHoldOf :execrows
DELETE FROM active_player_holds WHERE session_player_id = @session_player_id;

-- name: FinishMatchSegments :exec
UPDATE match_participations SET finished_with_match = true, updated_at = @now WHERE match_id = @match_id AND left_at IS NULL;

-- name: InsertMatchDecision :exec
INSERT INTO match_decisions (match_id, club_id, session_id, kind, winning_team, team_a_score, team_b_score, source_operation_id, confirmed_at, accepted_at, actor_club_id)
VALUES (@match_id, @club_id, @session_id, @kind::match_decision_kind, sqlc.narg('winning_team')::team_side, @team_a_score, @team_b_score, @source_operation_id, @now, @now, @actor_club_id);

-- name: EndMatch :exec
UPDATE matches SET state = @state::match_state, ended_at = @now, almost_done_at = NULL, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: InsertSyncConflict :exec
INSERT INTO sync_conflicts (id, club_id, session_id, category, evidence, detected_at, created_at, updated_at)
VALUES (@id, @club_id, @session_id, 'contradictory_decision', @evidence::jsonb, @now, @now, @now);

-- name: ListMatchIDsOfGeneration :many
SELECT id FROM matches WHERE session_id = @session_id AND generation_id = @generation_id ORDER BY match_no;

-- name: ListMatchesBySourceOperations :many
SELECT id, session_id, source_operation_id FROM matches WHERE source_operation_id = ANY(@keys::uuid[]);

-- name: RemoveWaitingMatches :exec
-- A removed draft keeps its number and leaves the queue.
UPDATE matches SET removed_at = @now, queue_position = NULL, revision = revision + 1, updated_at = @now WHERE id = ANY(@ids::uuid[]) AND state = 'waiting';

-- name: RemoveWaitingMatch :exec
UPDATE matches SET removed_at = @now, queue_position = NULL, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: ListMatchSegmentPlayers :many
-- The players of a match's segments. Prisma's include with no orderBy (generationRows, the retry of Auto queue and Regenerate) read them in
-- index order, by player; a unique order here (player, segment) gives the same.
SELECT session_player_id FROM match_participations WHERE match_id = @match_id ORDER BY session_player_id, segment_no;

-- Session level (packages/db/src/queue/session-preparation.ts applySessionEnd, session-cancel.ts, finalization.ts invalidateSession).

-- name: SetQueueSessionEnd :exec
UPDATE queue_sessions SET scheduled_end_at = @scheduled_end_at, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: CloseOpenDropOutNotices :exec
-- closeSessionMatchRequests, first half: the open drop-out notices close with no decision.
UPDATE session_drop_out_notices SET status = 'closed', closed_at = @now WHERE session_id = @session_id AND status = 'open';

-- name: CloseOpenMatchRequests :exec
-- closeSessionMatchRequests, second half: every open match request closes (kept, hidden).
UPDATE session_match_requests SET status = 'closed', decided_at = @now, revision = revision + 1, updated_at = @now WHERE session_id = @session_id AND status = 'open';

-- name: CancelQueueSession :exec
UPDATE queue_sessions SET state = 'cancelled', cancelled_at = @now, cancel_reason = @cancel_reason, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: InvalidateQueueSession :exec
UPDATE queue_sessions SET state = 'invalid', invalid_reason = @invalid_reason, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: CountActiveMatches :one
SELECT count(*)::int FROM matches WHERE session_id = @session_id AND state = 'active';

-- name: RemoveAllWaitingMatches :exec
-- Every waiting draft leaves the queue; the revision stays (updateMany with a removal time and no position).
UPDATE matches SET removed_at = @now, queue_position = NULL, updated_at = @now WHERE session_id = @session_id AND state = 'waiting' AND removed_at IS NULL;

-- The Player's match request (packages/db/src/queue/match-requests.ts sendMatchRequest, cancelMatchRequest).

-- name: GetSessionOfSlugWithPublication :one
-- sessionBySlug of match-requests.ts: the session behind a public link and its publication state (a removed page is not found).
SELECT s.id, s.club_id, coalesce(p.state::text, '')::text AS publication_state
FROM queue_sessions s LEFT JOIN session_publications p ON p.session_id = s.id
WHERE s.public_slug = @slug;

-- name: GetMatchRequestWithPlayer :one
-- The request a retry names, with the Player who owns its roster entry (null for a guest).
SELECT r.id, r.session_id, cp.player_id
FROM session_match_requests r
JOIN session_players sp ON sp.id = r.session_player_id
JOIN club_players cp ON cp.club_id = sp.club_id AND cp.id = sp.club_player_id
WHERE r.id = @id;

-- name: GetOpenMatchRequestOfEntry :one
-- findFirst of an open request of a roster entry (at most one is open at a time; the order only makes the pick total).
SELECT id FROM session_match_requests WHERE session_id = @session_id AND session_player_id = @session_player_id AND status = 'open' ORDER BY requested_at, id LIMIT 1;

-- name: InsertSessionMatchRequest :exec
INSERT INTO session_match_requests (id, club_id, session_id, session_player_id, format, requested_at, created_at, updated_at)
VALUES (@id, @club_id, @session_id, @session_player_id, @format::match_format, @now, @now, @now);

-- name: InsertMatchRequestSpot :exec
INSERT INTO session_match_request_spots (request_id, club_id, session_id, side, slot_no, session_player_id)
VALUES (@request_id, @club_id, @session_id, @side::match_request_side, @slot_no, @session_player_id);

-- name: CancelMatchRequest :exec
UPDATE session_match_requests SET status = 'cancelled', decided_at = @now, revision = revision + 1, updated_at = @now WHERE id = @id;

-- Publish results (packages/db/src/queue/results.ts publishResults).

-- name: GetPublicationEventByCommand :one
SELECT session_id, slides::text[] AS slides, include_off_day, occurred_at FROM session_publication_events WHERE source_command_id = @source_command_id;

-- name: GetPublicationOfSession :one
SELECT id, state::text AS state FROM session_publications WHERE session_id = @session_id;

-- name: GetClubExpiryCycle :one
SELECT current_expiry_cycle_id FROM club_entitlements WHERE club_id = @club_id;

-- name: ListRosterForPublication :many
-- pageProjections: the live roster in slot order (confirmed time, then id) with the picture of a registered player.
SELECT sp.name_snapshot, sp.player_id_at_entry, p.avatar_ref
FROM session_players sp
JOIN club_players cp ON cp.club_id = sp.club_id AND cp.id = sp.club_player_id
LEFT JOIN players p ON p.id = cp.player_id
WHERE sp.session_id = @session_id AND sp.released_at IS NULL AND sp.no_show_at IS NULL
ORDER BY sp.confirmed_at, sp.id;

-- name: InsertSessionPublication :exec
INSERT INTO session_publications (id, club_id, session_id, public_key, details_projection, participants_projection, expiry_cycle_id, last_synced_at, created_at, updated_at)
VALUES (@id, @club_id, @session_id, @public_key, @details_projection::jsonb, @participants_projection::jsonb, @expiry_cycle_id, @now, @now, @now);

-- name: PublishSessionPublication :exec
UPDATE session_publications
SET state = 'published', published_snapshot_id = @published_snapshot_id, published_slides = CAST(sqlc.arg(published_slides)::text[] AS result_slide[]), include_off_day = @include_off_day,
    public_results = @public_results::jsonb, published_at = @now, last_synced_at = @now, revision = revision + 1, updated_at = @now
WHERE id = @id;

-- name: InsertPublicationEvent :exec
INSERT INTO session_publication_events (id, club_id, session_id, publication_id, snapshot_id, slides, include_off_day, actor_club_id, source_command_id, occurred_at)
VALUES (@id, @club_id, @session_id, @publication_id, @snapshot_id, CAST(sqlc.arg(slides)::text[] AS result_slide[]), @include_off_day, @actor_club_id, @source_command_id, @now);

-- name: ListPublicationSummaries :many
SELECT club_player_id, player_id_snapshot, full_games FROM club_session_player_summaries WHERE session_id = @session_id ORDER BY session_player_id;

-- name: ListHistoryAttributionPlayers :many
SELECT club_player_id, player_id FROM player_history_attributions WHERE club_id = @club_id AND club_player_id = ANY(@club_player_ids::uuid[]) AND revoked_at IS NULL ORDER BY club_player_id, player_id;

-- name: ClearWaitingMatches :execrows
-- Clear queue: every waiting match stays as a removed draft. The count is the answer.
UPDATE matches SET removed_at = @now, queue_position = NULL, revision = revision + 1, updated_at = @now WHERE session_id = @session_id AND state = 'waiting' AND removed_at IS NULL;

-- name: PauseMatch :exec
-- Pause match: a Playing match goes back to Getting ready on its court(s). The start time clears; placed_at is kept when it has one.
UPDATE matches SET state = 'on_court', started_at = NULL, almost_done_at = NULL, placed_at = COALESCE(placed_at, @now), revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: SetParticipationTeam :exec
-- Switch sides and Swap from match: one open segment changes team in place.
UPDATE match_participations SET team = @team, updated_at = @now WHERE id = @id;

-- name: SetMatchAlmostDone :exec
-- Almost done: the Queue Master's switch on a Playing match. A time turns it on, null turns it off.
UPDATE matches SET almost_done_at = sqlc.narg('almost_done_at')::timestamptz, revision = revision + 1, updated_at = @now WHERE id = @id;
