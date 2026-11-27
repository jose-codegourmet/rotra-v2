-- Queue writes (go-writes-queue), session preparation and courts: packages/db/src/queue/session-preparation.ts and
-- session-delete.ts. Prisma stamps created_at and updated_at with the application clock, so each statement takes @now.

-- name: GetClubVenue :one
SELECT * FROM club_venues WHERE club_id = @club_id AND id = @id;

-- name: GetClubDefaultPlayersPerCourt :one
SELECT default_players_per_court FROM clubs WHERE id = @id;

-- name: ListClashCandidates :many
-- clashCandidates: the club's sessions that can clash (not invalid, not cancelled). The TypeScript has no order; the id is the
-- tiebreaker here.
SELECT id, title, venue_id, venue_name, scheduled_start_at, scheduled_end_at
FROM queue_sessions WHERE club_id = @club_id AND state NOT IN ('invalid', 'cancelled')
ORDER BY scheduled_start_at, id;

-- name: GetQueueSessionBySourceCommand :one
SELECT id, club_id, series_id FROM queue_sessions WHERE source_command_id = @source_command_id;

-- name: CountQueueSeriesSessions :one
SELECT count(*)::int4 FROM queue_sessions WHERE club_id = @club_id AND series_id = @series_id;

-- name: InsertQueueSession :exec
INSERT INTO queue_sessions (id, club_id, title, notes, scheduled_start_at, scheduled_end_at, venue_id, venue_name, venue_address,
                            session_mode, allow_singles, allow_doubles, minimum_games, minimum_is_calculated, players_per_court,
                            expected_players, request_formats, record_games, series_id, public_slug, source_command_id,
                            created_at, updated_at)
VALUES (@id, @club_id, @title, @notes, @scheduled_start_at, @scheduled_end_at, @venue_id, @venue_name, @venue_address,
        @session_mode, @allow_singles, @allow_doubles, @minimum_games, @minimum_is_calculated, @players_per_court,
        @expected_players, CAST(@request_formats::text[] AS match_format[]), @record_games, @series_id, @public_slug, @source_command_id,
        @now, @now);

-- name: UpdateQueueSessionPreparation :exec
-- updateQueueSession: Edit preparation. A request_formats or record_games that is null keeps the stored value.
UPDATE queue_sessions
SET title = @title, notes = @notes, venue_id = @venue_id, venue_name = @venue_name, venue_address = @venue_address,
    scheduled_start_at = @scheduled_start_at, scheduled_end_at = @scheduled_end_at, session_mode = @session_mode,
    allow_singles = @allow_singles, allow_doubles = @allow_doubles, minimum_games = @minimum_games,
    minimum_is_calculated = @minimum_is_calculated, expected_players = @expected_players, players_per_court = @players_per_court,
    request_formats = COALESCE(CAST(sqlc.narg('request_formats')::text[] AS match_format[]), request_formats),
    record_games = COALESCE(sqlc.narg('record_games')::boolean, record_games),
    revision = revision + 1, updated_at = @now
WHERE id = @id;

-- name: ListQueueSessionCourts :many
-- liveCourts: the session's courts that were not removed, in court order (position, then creation time and id).
SELECT * FROM session_courts WHERE session_id = @session_id AND removed_at IS NULL ORDER BY position ASC, created_at ASC, id ASC;

-- name: GetSessionCourt :one
SELECT * FROM session_courts WHERE id = @id;

-- name: InsertSessionCourt :one
INSERT INTO session_courts (id, club_id, session_id, label, position, starts_at, open_until, created_at, updated_at)
VALUES (@id, @club_id, @session_id, @label, @position, @starts_at, @open_until, @now, @now)
RETURNING *;

-- name: NextSessionCourtPosition :one
-- nextCourtPosition: a new court goes after every court of the session, removed ones included.
SELECT (COALESCE(max(position), 0) + 1)::int4 FROM session_courts WHERE session_id = @session_id;

-- name: DropSessionCourt :exec
-- Edit preparation drops the courts left out of the form: removed_at only (no revision bump).
UPDATE session_courts SET removed_at = @now, updated_at = @now WHERE id = @id;

-- name: EditSessionCourt :one
-- A court's label, planned start and advisory end, with a revision bump. No row (another club's, or gone) is not found.
UPDATE session_courts SET label = @label, position = COALESCE(sqlc.narg('position')::int4, position), starts_at = @starts_at, open_until = @open_until, revision = revision + 1, updated_at = @now
WHERE club_id = @club_id AND session_id = @session_id AND id = @id
RETURNING *;

-- name: RemoveSessionCourt :exec
UPDATE session_courts SET removed_at = @now, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: SetSessionCourtEarlyOpen :one
-- openCourtsEarly (a time) and undoCourtEarlyOpen (null).
UPDATE session_courts SET opened_early_at = sqlc.narg('opened_early_at'), revision = revision + 1, updated_at = @now WHERE id = @id
RETURNING *;

-- name: CountMatchCourtUsage :one
SELECT count(*)::int4 FROM match_court_usage WHERE club_id = @club_id AND court_id = @court_id;

-- name: CourtIsHeld :one
-- An On court or Playing match holds the court (active_court_holds).
SELECT EXISTS (SELECT 1 FROM active_court_holds WHERE court_id = @court_id);

-- name: SetQueueSessionJoinSwitches :exec
-- setAcceptJoinRequests and setAlwaysRequireRequest: one switch changes, the revision bumps.
UPDATE queue_sessions
SET accept_join_requests = COALESCE(sqlc.narg('accept_join_requests')::boolean, accept_join_requests),
    always_require_request = COALESCE(sqlc.narg('always_require_request')::boolean, always_require_request),
    revision = revision + 1, updated_at = @now
WHERE id = @id;

-- name: FindRunningQueueSession :one
-- Another session of the club that is running or finalizing.
SELECT title FROM queue_sessions WHERE club_id = @club_id AND id <> @id AND state IN ('active', 'finalizing') ORDER BY id LIMIT 1;

-- name: LockSessionPlayerLevelAtStart :exec
-- startSession: every live entry's level locks; one that is present also stamps its presence time.
UPDATE session_players
SET level_locked_at = @now, present_changed_at = CASE WHEN present THEN @now ELSE present_changed_at END,
    revision = revision + 1, updated_at = @now
WHERE id = @id;

-- name: StartQueueSession :exec
-- A late or other-day start also moves the end (scheduled_end_at null keeps it), and one on an earlier day than planned moves the start to
-- now (scheduled_start_at null keeps it). The planned window at Start is kept for Back to preparation (owner, November 25, 2026).
UPDATE queue_sessions
SET state = 'active', started_at = @now, scheduled_end_at = COALESCE(sqlc.narg('scheduled_end_at')::timestamptz, scheduled_end_at),
    scheduled_start_at = COALESCE(sqlc.narg('scheduled_start_at')::timestamptz, scheduled_start_at),
    planned_start_before_start_at = scheduled_start_at, planned_end_before_start_at = scheduled_end_at,
    start_license_term_id = @start_license_term_id, revision = revision + 1, updated_at = @now
WHERE id = @id;

-- name: BackToPreparationQueueSession :exec
-- backToPreparation: prepared again with no start time or license term; the planned window comes back to what it was at Start (a session
-- started before that was kept keeps its current times). The session is prepared first: the level-lock trigger allows an unlock only then.
UPDATE queue_sessions
SET state = 'prepared', started_at = NULL, start_license_term_id = NULL,
    scheduled_start_at = COALESCE(planned_start_before_start_at, scheduled_start_at),
    scheduled_end_at = COALESCE(planned_end_before_start_at, scheduled_end_at),
    planned_start_before_start_at = NULL, planned_end_before_start_at = NULL,
    revision = revision + 1, updated_at = @now
WHERE id = @id;

-- name: ClearCourtsOpenedEarly :exec
UPDATE session_courts SET opened_early_at = NULL, revision = revision + 1, updated_at = @now WHERE session_id = @session_id AND opened_early_at IS NOT NULL;

-- name: UnlockSessionPlayerLevels :exec
UPDATE session_players SET level_locked_at = NULL, revision = revision + 1, updated_at = @now WHERE session_id = @session_id AND level_locked_at IS NOT NULL;

-- name: CountPlayedMatches :one
-- A match that is Playing, done or invalid: a game has started.
SELECT count(*)::int4 FROM matches WHERE session_id = @session_id AND state IN ('active', 'completed', 'invalid');

-- name: CountUnstartedMatches :one
SELECT count(*)::int4 FROM matches WHERE session_id = @session_id AND state IN ('waiting', 'on_court') AND removed_at IS NULL;

-- name: CloseQueueJoinRequestsAtStart :execrows
-- updateMany: the pending requests close (closed, not declined); the revision stays.
UPDATE session_join_requests SET status = 'closed', decided_at = @now, updated_at = @now
WHERE club_id = @club_id AND session_id = @session_id AND status = 'pending';

-- name: ListClubPlayerAccounts :many
SELECT id, player_id FROM club_players WHERE id = ANY(@ids::uuid[]) ORDER BY id;

-- name: DeleteQueueSessionWaitlist :exec
DELETE FROM session_waitlist WHERE session_id = @session_id;

-- name: DeleteQueueSessionJoinRequests :exec
DELETE FROM session_join_requests WHERE session_id = @session_id;

-- name: DeleteQueueSessionPaymentMarks :exec
DELETE FROM session_payment_marks WHERE session_id = @session_id;

-- name: DeleteQueueSessionShuttlePlanLines :exec
DELETE FROM session_shuttle_plan_lines WHERE session_id = @session_id;

-- name: DeleteQueueSessionCostEstimates :exec
DELETE FROM session_cost_estimates WHERE session_id = @session_id;

-- name: ClearQueueSessionPlayerAssessments :exec
UPDATE session_players SET assessment_id = NULL, updated_at = @now WHERE session_id = @session_id;

-- name: ClearQueueSessionAssessmentLinks :exec
UPDATE club_assessments SET supersedes_id = NULL WHERE session_id = @session_id;

-- name: DeleteQueueSessionAssessments :exec
DELETE FROM club_assessments WHERE session_id = @session_id;

-- name: DeleteQueueSessionPlayers :exec
DELETE FROM session_players WHERE session_id = @session_id;

-- name: DeleteQueueSessionReservations :exec
DELETE FROM club_session_reservations WHERE club_id = @club_id AND session_id = @session_id;

-- name: DeleteQueueSessionCourts :exec
DELETE FROM session_courts WHERE session_id = @session_id;

-- name: DeleteQueueSession :exec
DELETE FROM queue_sessions WHERE id = @id;

-- name: SetSessionCourtPosition :one
-- Reorder courts: a court takes its new place, with a revision bump.
UPDATE session_courts SET position = @position, revision = revision + 1, updated_at = @now WHERE id = @id RETURNING *;
