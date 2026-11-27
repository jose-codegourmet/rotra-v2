-- The Queue app's session reads: the list, one session, its roster and its matches.
-- Ports of packages/db/src/queue/{session-preparation,session-roster,match-queue,match-store}.ts. Reads only.

-- Every club session in start order, or the one named; the counts are sessionSummaryDto's. request_formats is the
-- Players can request list (an enum array, read as text). A session of another club is not returned.
-- name: ListQueueSessions :many
SELECT s.id, s.club_id, s.title, s.notes, s.scheduled_start_at, s.scheduled_end_at, s.venue_id, s.venue_name, s.venue_address,
       s.state, s.invalid_reason, s.cancelled_at, s.cancel_reason, s.session_mode, s.allow_singles, s.allow_doubles,
       s.minimum_games, s.minimum_is_calculated, s.players_per_court, s.expected_players, s.started_at, s.finalized_at,
       s.series_id, s.public_slug, s.accept_join_requests, s.always_require_request, s.court_fill_mode,
       s.request_formats::text[] AS request_formats, s.record_games, s.revision, s.queue_revision,
       s.planned_start_before_start_at, s.planned_end_before_start_at,
       (s.start_license_term_id IS NOT NULL)::bool AS has_start_term,
       (SELECT count(*) FROM session_players p WHERE p.session_id = s.id AND p.released_at IS NULL AND p.no_show_at IS NULL)::int AS roster_count,
       (SELECT count(*) FROM session_players p WHERE p.session_id = s.id AND p.released_at IS NULL AND p.no_show_at IS NULL AND p.present)::int AS present_count,
       (SELECT count(*) FROM session_waitlist w WHERE w.session_id = s.id)::int AS waitlist_count,
       (SELECT count(*) FROM active_court_holds h WHERE h.club_id = s.club_id AND h.session_id = s.id)::int AS courts_in_use,
       (SELECT count(*) FROM matches m WHERE m.club_id = s.club_id AND m.session_id = s.id AND m.state = 'completed')::int AS games_played,
       (SELECT count(*) FROM matches m WHERE m.club_id = s.club_id AND m.session_id = s.id AND m.state = 'waiting' AND m.removed_at IS NULL)::int AS queued_count
FROM queue_sessions s
WHERE s.club_id = @club_id AND (sqlc.narg('session_id')::uuid IS NULL OR s.id = sqlc.narg('session_id')::uuid)
ORDER BY s.scheduled_start_at ASC, s.id ASC;

-- The live courts of every session of the club, in court order (liveCourts).
-- name: ListQueueLiveCourts :many
SELECT id, session_id, label, position, starts_at, opened_early_at, open_until, removed_at
FROM session_courts
WHERE club_id = @club_id AND removed_at IS NULL
ORDER BY position ASC, created_at ASC, id ASC;

-- Join requests still pending plus open drop-out notices of live roster entries: Requests · N on a prepared session.
-- name: CountQueuePendingJoinRequests :one
SELECT count(*)::int FROM session_join_requests WHERE session_id = @session_id AND status = 'pending';

-- name: CountQueueOpenDropOuts :one
SELECT count(*)::int
FROM session_drop_out_notices n
JOIN session_players p ON p.id = n.session_player_id
WHERE n.session_id = @session_id AND n.status = 'open' AND p.released_at IS NULL AND p.no_show_at IS NULL;

-- liveOpenRequests: open match requests whose requester and every named player is on the live roster and present.
-- name: CountQueueLiveOpenRequests :one
SELECT count(*)::int
FROM session_match_requests r
WHERE r.session_id = @session_id AND r.status = 'open'
  AND EXISTS (SELECT 1 FROM session_players p WHERE p.id = r.session_player_id AND p.released_at IS NULL AND p.no_show_at IS NULL AND p.present)
  AND NOT EXISTS (
    SELECT 1 FROM session_match_request_spots sp
    WHERE sp.request_id = r.id AND sp.session_player_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM session_players p2 WHERE p2.id = sp.session_player_id AND p2.released_at IS NULL AND p2.no_show_at IS NULL AND p2.present));

-- Every entry of the session that was not released (live and no shows), in slot order, with the names a Queue Master
-- read shows (rosterNamesOf): a registered player's account nickname and the club's own, else the club's alone.
-- name: ListQueueRoster :many
SELECT sp.id, sp.session_id, sp.club_player_id, sp.name_snapshot, sp.present, sp.present_changed_at, sp.skill_level_id,
       sp.level_locked_at, sp.confirmed_at, sp.games_adjustment, sp.self_checked_in_at, sp.left_at, sp.revision,
       sp.no_show_at, cp.nickname AS club_nickname, p.nickname AS player_nickname, p.profile_state
FROM session_players sp
LEFT JOIN club_players cp ON cp.id = sp.club_player_id
LEFT JOIN players p ON p.id = cp.player_id
WHERE sp.session_id = @session_id AND sp.released_at IS NULL
ORDER BY sp.confirmed_at ASC, sp.id ASC;

-- The waitlist, unordered: the order is a rule applied in Go.
-- name: ListQueueWaitlist :many
SELECT id, session_id, club_player_id, skill_level_id, added_at, demoted_at, demoted_confirmed_at
FROM session_waitlist
WHERE session_id = @session_id;

-- Club players who played here before this session was finalized (or now): their entries show Played here before.
-- name: ListQueueReturningPlayers :many
SELECT DISTINCT s.club_player_id
FROM club_session_player_summaries s
JOIN session_finalizations f ON f.club_id = s.club_id AND f.session_id = s.session_id
WHERE s.club_id = @club_id
  AND s.club_player_id = ANY (@club_player_ids::uuid[])
  AND s.session_id <> @session_id
  AND f.committed_at < @before::timestamptz;

-- name: ListQueuePendingJoinRequests :many
SELECT r.id, r.session_id, r.name, r.nickname, r.phone_e164, r.stated_band, r.placement, r.status, r.requested_at,
       r.decided_at, r.club_player_id, r.player_id, p.avatar_ref, p.full_name AS player_full_name
FROM session_join_requests r
LEFT JOIN players p ON p.id = r.player_id
WHERE r.session_id = @session_id AND r.status = 'pending'
ORDER BY r.requested_at ASC, r.id ASC;

-- The revision of each match that was not discarded (the match rows the shared rules read carry none).
-- name: ListQueueMatchRevisions :many
SELECT id, revision FROM matches WHERE session_id = @session_id AND removed_at IS NULL;

-- The saved cost estimate of a session (costInput); no row is no fee.
-- name: GetQueueCostEstimate :one
SELECT court_fee_per_court_hour_minor, entrance_fee_per_head_minor, payment_mode, custom_fee_per_head_minor, revision
FROM session_cost_estimates
WHERE session_id = @session_id;

-- name: ListQueueShuttlePlanLines :many
SELECT inventory_item_id, tubes
FROM session_shuttle_plan_lines
WHERE session_id = @session_id
ORDER BY position ASC;

-- Every item of the club, removed ones too: an estimate still prices a removed item.
-- name: ListQueueClubInventoryPrices :many
SELECT id, name, unit_cost_minor FROM inventory_items WHERE club_id = @club_id;

-- name: ListQueuePaymentMarks :many
SELECT session_player_id, amount_minor, currency, marked_at
FROM session_payment_marks
WHERE session_id = @session_id;

-- Q-RESULTS: the private snapshot, the current publication, the finalization progress and the exports.
-- name: GetQueueFinalizationProgress :one
SELECT state::text AS state, stage::text AS stage FROM session_finalizations WHERE session_id = @session_id;

-- name: GetQueueLatestSnapshot :one
SELECT id, version, calculation_version, standings, awards, off_day, generated_at
FROM session_result_snapshots
WHERE session_id = @session_id
ORDER BY version DESC
LIMIT 1;

-- name: GetQueuePublication :one
SELECT state::text AS state, published_slides::text[] AS published_slides, include_off_day, published_at
FROM session_publications
WHERE session_id = @session_id;

-- name: ListQueueResultExports :many
SELECT id, format::text AS format, slides::text[] AS slides, include_off_day, frame_count, (asset_ref IS NOT NULL)::bool AS ready, created_at
FROM result_exports
WHERE session_id = @session_id AND deleted_at IS NULL
ORDER BY created_at DESC, id ASC
LIMIT 10;

-- Q-REQUESTS: the open match requests with their spots, and the open drop-out notices of live entries.
-- name: ListQueueOpenMatchRequests :many
SELECT id, session_player_id, format::text AS format, requested_at
FROM session_match_requests
WHERE session_id = @session_id AND status = 'open'
ORDER BY requested_at ASC, id ASC;

-- name: ListQueueMatchRequestSpots :many
SELECT request_id, side::text AS side, slot_no, session_player_id
FROM session_match_request_spots
WHERE session_id = @session_id
ORDER BY request_id, slot_no ASC;

-- name: ListQueueOpenDropOutNotices :many
SELECT n.id, n.session_id, n.session_player_id, n.player_id, n.created_at, p.name_snapshot, p.club_player_id,
       cp.nickname AS club_nickname, pl.nickname AS player_nickname, pl.profile_state
FROM session_drop_out_notices n
JOIN session_players p ON p.id = n.session_player_id
LEFT JOIN club_players cp ON cp.id = p.club_player_id
LEFT JOIN players pl ON pl.id = cp.player_id
WHERE n.session_id = @session_id AND n.status = 'open' AND p.released_at IS NULL AND p.no_show_at IS NULL
ORDER BY n.created_at ASC, n.id ASC;
