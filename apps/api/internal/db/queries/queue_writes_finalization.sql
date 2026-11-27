-- Queue writes (go-writes-queue): Session done and the projection jobs it starts (packages/db/src/queue/finalization.ts finalizeSession,
-- settleFinalization; packages/db/src/player/projections.ts driveFinalizationJobs, runProjectionJobs, writeResultSnapshot, recomputeRank).
-- Prisma stamps @updatedAt and @default(now()) with the application clock, so each statement takes the time from @now.

-- name: GetSessionFinalization :one
SELECT * FROM session_finalizations WHERE session_id = @session_id;

-- name: ListSessionFinalizationJobs :many
-- statusDto: the jobs of a finalization. The TypeScript names no order; the list is in creation order (the ids are time ordered).
SELECT kind, status, attempts, last_error_code FROM projection_jobs WHERE source_finalization_id = @session_id ORDER BY id;

-- name: LatestEffectiveRankingPolicy :one
-- The effective ranking settings at an instant: the newest effective version.
SELECT id, version, effective_at, algorithm_version FROM ranking_policy_versions WHERE effective_at <= @at ORDER BY effective_at DESC, version DESC LIMIT 1;

-- name: ListSealedSessionStreams :many
SELECT id, sealed_final_sequence::text AS final_sequence, sealed_digest FROM device_session_streams WHERE session_id = @session_id AND state = 'sealed' ORDER BY id;

-- name: ListFinalizableMatches :many
-- buildFacts: the completed matches with a completed decision, in match number order.
SELECT m.id, m.club_id, m.format, m.started_at, m.ended_at, d.winning_team, d.team_a_score, d.team_b_score, d.confirmed_at
FROM matches m JOIN match_decisions d ON d.match_id = m.id
WHERE m.session_id = @session_id AND m.state = 'completed' AND d.kind = 'completed'
ORDER BY m.match_no;

-- name: ListFinalizableParticipations :many
-- The segments of those matches. The TypeScript names no order, yet the last segment of a player and the partner and opponent lists follow it:
-- the segments are in segment order.
SELECT mp.match_id, mp.session_player_id, mp.team, mp.started_with_match, mp.finished_with_match
FROM match_participations mp
JOIN matches m ON m.id = mp.match_id
JOIN match_decisions d ON d.match_id = m.id
WHERE mp.session_id = @session_id AND m.state = 'completed' AND d.kind = 'completed'
ORDER BY mp.match_id, mp.segment_no, mp.id;

-- name: ListEveryRosterEntry :many
-- buildFacts reads every entry of the session, released ones too.
SELECT id, club_player_id, player_id_at_entry, name_snapshot, skill_level_id FROM session_players WHERE session_id = @session_id ORDER BY id;

-- name: InsertSessionFinalization :exec
INSERT INTO session_finalizations (session_id, club_id, command_id, state, stage, stream_manifest, manifest_digest, accepted_session_revision, policy_version_id,
  started_at, committed_at, completed_at, facts_digest, updated_at)
VALUES (@session_id, @club_id, @command_id, @state::finalization_state, @stage::finalization_stage, @stream_manifest::jsonb, @manifest_digest, @accepted_session_revision,
  @policy_version_id, @now, @now, @completed_at, @facts_digest, @now);

-- name: InsertPlayerMatchFact :exec
INSERT INTO player_match_facts (id, club_id, session_id, match_id, session_player_id, club_player_id, player_id_at_finalization, played_at, format, team, winning_team,
  full_participation, standard_match, skill_level_snapshot_id, partner_entry_ids, opponent_entry_ids, team_a_score, team_b_score, fact_version, created_at)
VALUES (@id, @club_id, @session_id, @match_id, @session_player_id, @club_player_id, @player_id_at_finalization, @played_at, @format, @team::team_side, @winning_team::team_side,
  @full_participation, @standard_match, @skill_level_snapshot_id, @partner_entry_ids::uuid[], @opponent_entry_ids::uuid[], @team_a_score, @team_b_score, @fact_version, @now);

-- name: InsertClubSessionSummary :exec
INSERT INTO club_session_player_summaries (id, club_id, session_id, session_player_id, club_player_id, player_id_snapshot, full_games, standard_games, fun_games, wins, losses,
  skill_level_snapshot_id, summary_version, projected_at)
VALUES (@id, @club_id, @session_id, @session_player_id, @club_player_id, @player_id_snapshot, @full_games, @standard_games, @fun_games, @wins, @losses,
  @skill_level_snapshot_id, @summary_version, @now);

-- name: ListUnstartedOnCourtMatchIDs :many
-- dropUnstarted: the On court matches (placed, never started) that were not removed.
SELECT id FROM matches WHERE session_id = @session_id AND state = 'on_court' AND removed_at IS NULL ORDER BY id;

-- name: ReleaseUnstartedCourtUsage :exec
UPDATE match_court_usage SET released_at = @now WHERE match_id = ANY(@match_ids::uuid[]) AND released_at IS NULL;

-- name: DeleteHeldCourtsOf :exec
DELETE FROM active_court_holds WHERE match_id = ANY(@match_ids::uuid[]);

-- name: DeleteHeldPlayersOf :exec
DELETE FROM active_player_holds WHERE match_id = ANY(@match_ids::uuid[]);

-- name: ResetUnstartedMatches :exec
-- An On court match that never started goes back to waiting; the next statement removes it with the other waiting ones.
UPDATE matches SET state = 'waiting', placed_at = NULL, updated_at = @now WHERE id = ANY(@match_ids::uuid[]);

-- name: CompleteQueueSession :exec
UPDATE queue_sessions SET state = 'completed', finalized_at = @now, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: InsertProjectionJob :exec
INSERT INTO projection_jobs (id, kind, kind_version, source_type, source_finalization_id, status, next_attempt_at, completed_at, created_at, updated_at)
VALUES (@id, @kind::projection_kind, @kind_version, 'finalization', @session_id, @status::projection_job_status, @now, @completed_at, @now, @now);

-- name: RetryFailedProjectionJobs :exec
-- driveFinalizationJobs with retryFailed: this session's failed jobs with attempts left are due now.
UPDATE projection_jobs SET next_attempt_at = @now, updated_at = @now WHERE source_finalization_id = @session_id AND status = 'failed' AND attempts < @max_attempts;

-- name: ReleaseStaleProjectionJobs :exec
-- releaseStaleJobs: a job a lost request left running past the lease retries.
UPDATE projection_jobs SET status = 'pending', locked_at = NULL, updated_at = @now WHERE status = 'running' AND locked_at < @cutoff AND source_finalization_id = @session_id;

-- name: ListDueProjectionJobIDs :many
-- runProjectionJobs: this session's due jobs, locked, skipping the ones another request holds.
SELECT id FROM projection_jobs
WHERE status IN ('pending', 'failed') AND next_attempt_at <= @now AND attempts < @max_attempts AND source_finalization_id = @session_id
ORDER BY next_attempt_at, id LIMIT @batch FOR UPDATE SKIP LOCKED;

-- name: ClaimProjectionJobs :many
UPDATE projection_jobs SET status = 'running', locked_at = @now, attempts = attempts + 1, updated_at = @now WHERE id = ANY(@ids::uuid[])
RETURNING id, kind, source_finalization_id, target_player_id, attempts;

-- name: FinishProjectionJob :exec
UPDATE projection_jobs SET status = 'done', completed_at = @now, locked_at = NULL, last_error_code = NULL, updated_at = @now WHERE id = @id;

-- name: FailProjectionJob :exec
UPDATE projection_jobs SET status = 'failed', locked_at = NULL, last_error_code = @last_error_code, next_attempt_at = @next_attempt_at, updated_at = @now WHERE id = @id;

-- name: ListFinalizationJobStates :many
SELECT kind, status, last_error_code FROM projection_jobs WHERE source_finalization_id = @session_id ORDER BY id;

-- name: SettleFinalizationFailed :exec
UPDATE session_finalizations SET state = 'failed', failed_stage = @failed_stage::finalization_stage, failure_code = @failure_code, revision = revision + 1, updated_at = @now WHERE session_id = @session_id;

-- name: SettleFinalizationDone :exec
UPDATE session_finalizations SET state = 'done', stage = 'slides', failed_stage = NULL, failure_code = NULL, completed_at = @now, revision = revision + 1, updated_at = @now WHERE session_id = @session_id;

-- name: SettleFinalizationCommitted :exec
UPDATE session_finalizations SET state = 'committed', stage = @stage::finalization_stage, failed_stage = NULL, failure_code = NULL, revision = revision + 1, updated_at = @now WHERE session_id = @session_id;

-- name: GetResultSnapshotOfSession :one
SELECT id FROM session_result_snapshots WHERE session_id = @session_id AND version = 1;

-- name: ListClubPlayerProfiles :many
-- The saved players of the roster and the profile each links to.
SELECT id, player_id FROM club_players WHERE club_id = @club_id AND id = ANY(@ids::uuid[]) ORDER BY id;

-- name: ListPriorSessionSummaries :many
-- The award baseline's sessions: these players' summaries of earlier sessions whose finalization committed before this one finished. The TypeScript
-- names no order; the rows are in session order, so the stored baseline session ids are too.
SELECT s.club_player_id, s.session_id
FROM club_session_player_summaries s
JOIN session_finalizations f ON f.club_id = s.club_id AND f.session_id = s.session_id
WHERE s.club_id = @club_id AND s.club_player_id = ANY(@ids::uuid[]) AND s.session_id <> @session_id AND f.committed_at < @before
ORDER BY s.session_id, s.club_player_id, s.id;

-- name: ListPriorFullFacts :many
SELECT club_player_id, session_id, team::text AS team, winning_team::text AS winning_team
FROM player_match_facts
WHERE club_id = @club_id AND club_player_id = ANY(@ids::uuid[]) AND session_id = ANY(@session_ids::uuid[]) AND full_participation
ORDER BY id;

-- name: InsertResultSnapshot :exec
INSERT INTO session_result_snapshots (id, club_id, session_id, version, calculation_version, standings, awards, off_day, baseline_session_ids, generated_at)
VALUES (@id, @club_id, @session_id, 1, @calculation_version, @standings::jsonb, @awards::jsonb, @off_day::jsonb, @baseline_session_ids::uuid[], @generated_at);

-- name: ListFinalizationPlayerIDs :many
-- playersOfFinalization: the players whose facts came from this session, and the ones a reviewed link attributes its games to.
SELECT f.player_id_at_finalization::uuid AS player_id FROM player_match_facts f WHERE f.session_id = @session_id AND f.player_id_at_finalization IS NOT NULL
UNION
SELECT a.player_id FROM player_history_attributions a
WHERE a.revoked_at IS NULL AND EXISTS (SELECT 1 FROM player_match_facts f WHERE f.club_id = a.club_id AND f.club_player_id = a.club_player_id AND f.session_id = @session_id)
ORDER BY 1;

-- name: ListPlayerAttributions :many
SELECT club_id, club_player_id FROM player_history_attributions WHERE player_id = @player_id AND revoked_at IS NULL ORDER BY id;

-- name: ListPlayerRankFacts :many
-- playerFacts: the player's own snapshots plus confirmed, unrevoked guest history, newest first. The caller keeps the facts whose club and saved
-- player are one of the attributions (this query matches on the saved player alone).
SELECT club_id, club_player_id, player_id_at_finalization, match_id, session_player_id, played_at, created_at, full_participation, standard_match
FROM player_match_facts
WHERE player_id_at_finalization = @player_id OR club_player_id = ANY(@club_player_ids::uuid[])
ORDER BY played_at DESC, match_id, session_player_id;

-- name: CountPlayerAssessmentsInWindow :one
SELECT count(*)::int FROM club_assessments WHERE player_id_at_assessment = @player_id AND assessed_at >= @from_at AND assessed_at <= @to_at;

-- name: GetPlayerRankCurrent :one
SELECT player_id, input_watermark FROM player_rank_current WHERE player_id = @player_id;

-- name: InsertPlayerRankCurrent :exec
INSERT INTO player_rank_current (player_id, skill_level_id, numeric_rank, state, explanation_code, assessment_component, performance_component, input_counts, policy_version_id,
  algorithm_version, window_start, window_end, calculated_at, input_watermark, next_recheck_at, recent_standard_match_count, last_valid_played_at, leaderboard_eligible, updated_at)
VALUES (@player_id, NULL, NULL, @state::rank_state, @explanation_code, NULL, NULL, @input_counts::jsonb, @policy_version_id, @algorithm_version, @window_start, @window_end, @now,
  @input_watermark, @next_recheck_at, @recent_standard_match_count, @last_valid_played_at, false, @now);

-- name: UpdatePlayerRankCurrent :exec
UPDATE player_rank_current SET skill_level_id = NULL, numeric_rank = NULL, state = @state::rank_state, explanation_code = @explanation_code, assessment_component = NULL,
  performance_component = NULL, input_counts = @input_counts::jsonb, policy_version_id = @policy_version_id, algorithm_version = @algorithm_version, window_start = @window_start,
  window_end = @window_end, calculated_at = @now, input_watermark = @input_watermark, next_recheck_at = @next_recheck_at, recent_standard_match_count = @recent_standard_match_count,
  last_valid_played_at = @last_valid_played_at, leaderboard_eligible = false, revision = revision + 1, updated_at = @now
WHERE player_id = @player_id;

-- name: ListMatchRegisteredPlayers :many
-- The registered players (players.id, never a club player id) who played a match: the player ids of the live-update event of its end
-- (B-50), so their own night updates live. A player is found through the saved player's link, the way ownEntry finds their roster entry.
SELECT DISTINCT cp.player_id::uuid AS player_id
FROM match_participations mp
JOIN session_players sp ON sp.id = mp.session_player_id
JOIN club_players cp ON cp.club_id = sp.club_id AND cp.id = sp.club_player_id
WHERE mp.match_id = @match_id AND cp.player_id IS NOT NULL
ORDER BY 1;

-- name: ListSessionRegisteredPlayers :many
-- The registered players on a session's roster (released entries too): the player ids of the live-update event of Session done (B-50),
-- so their My sessions update live. Found through the saved player's link, as ownEntry does.
SELECT DISTINCT cp.player_id::uuid AS player_id
FROM session_players sp
JOIN club_players cp ON cp.club_id = sp.club_id AND cp.id = sp.club_player_id
WHERE sp.session_id = @session_id AND cp.player_id IS NOT NULL
ORDER BY 1;

-- name: GetSessionRecordGames :one
-- statusDto: Record games (D-2026-11-20-02) of the session a finalization is for; false = not ranked.
SELECT record_games FROM queue_sessions WHERE id = @id;
