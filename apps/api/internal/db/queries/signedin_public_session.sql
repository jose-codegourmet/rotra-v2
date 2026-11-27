-- The signed-in Player's reads of a session page: access (#569), My night, match history (#850), the player's own open
-- match request and the Request a match options, and Compare. Ports of packages/db/src/queue/{public-session,
-- match-requests,match-store}.ts and packages/db/src/player/compare.ts. Reads only.

-- The session behind a page slug; a page removed by retention (its publication deleted) is gone for the public.
-- request_formats is the Players can request list (an enum array, read as text).
-- name: GetSessionForPlayerRead :one
SELECT s.id,
       s.club_id,
       s.state,
       s.started_at,
       s.scheduled_start_at,
       s.minimum_games,
       s.accept_join_requests,
       s.record_games,
       s.players_per_court,
       s.request_formats::text[] AS request_formats,
       COALESCE(sp.state = 'deleted', false)::bool AS publication_deleted
FROM queue_sessions s
LEFT JOIN session_publications sp ON sp.session_id = s.id
WHERE s.public_slug = @slug;

-- Every roster entry of a session in slot order (liveRoster is the ones with neither released_at nor no_show_at).
-- name: ListSessionRosterRows :many
SELECT id,
       club_player_id,
       name_snapshot,
       present,
       present_changed_at,
       skill_level_id,
       level_locked_at,
       confirmed_at,
       self_checked_in_at,
       left_at,
       (released_at IS NULL AND no_show_at IS NULL)::bool AS is_live
FROM session_players
WHERE session_id = @session_id
ORDER BY confirmed_at ASC, id ASC;

-- All courts of a session in court order, removed ones too (liveCourts is the ones with no removed_at).
-- name: ListSessionCourtRows :many
SELECT id, label, position, starts_at, opened_early_at, open_until, removed_at
FROM session_courts
WHERE session_id = @session_id
ORDER BY position ASC, created_at ASC, id ASC;

-- The session's matches that were not discarded, with their decision.
-- name: ListSessionMatchRows :many
SELECT m.id,
       m.session_id,
       m.match_no,
       m.state,
       m.format,
       m.queue_position,
       m.origin,
       m.manual_protected,
       m.placed_at,
       m.started_at,
       m.ended_at,
       m.almost_done_at,
       d.kind AS decision_kind,
       d.winning_team AS decision_winning_team,
       d.team_a_score AS decision_team_a_score,
       d.team_b_score AS decision_team_b_score,
       d.confirmed_at AS decision_confirmed_at,
       d.source_operation_id AS decision_source_operation_id
FROM matches m
LEFT JOIN match_decisions d ON d.match_id = m.id
WHERE m.session_id = @session_id
  AND m.removed_at IS NULL
ORDER BY m.match_no ASC;

-- name: ListSessionParticipationRows :many
SELECT id, match_id, session_player_id, team, joined_operation_id, left_operation_id, joined_at, left_at, finished_with_match, credit_to
FROM match_participations
WHERE session_id = @session_id
ORDER BY joined_at ASC, id ASC;

-- The courts a placed or playing match holds. The order is not defined in the TypeScript; held_at then the court id
-- is the order a 5v5 label is written in here.
-- name: ListSessionCourtHoldRows :many
SELECT match_id, court_id
FROM active_court_holds
WHERE session_id = @session_id
ORDER BY held_at ASC, court_id ASC;

-- name: ListSessionCourtUsageRows :many
SELECT match_id, court_id, released_at, release_operation_id
FROM match_court_usage
WHERE session_id = @session_id
ORDER BY acquired_at ASC, id ASC;

-- The saved players behind roster entries and what the name rules read about them: the player (picture, nickname,
-- profile state and visibility, banner, RTR ID) and the shared entry of an unclaimed person (D-2026-11-16-04).
-- name: ListRosterPeople :many
SELECT cp.id,
       cp.player_id,
       cp.nickname AS club_nickname,
       (se.id IS NOT NULL)::bool AS has_shared_entry,
       se.rtr_id AS shared_rtr_id,
       se.claimed_player_id AS shared_claimed_player_id,
       se.retired_at AS shared_retired_at,
       p.avatar_ref,
       p.nickname AS player_nickname,
       p.profile_state,
       p.profile_visibility,
       pb.id AS banner_id,
       pb.image AS banner_image,
       a.rtr_id AS player_rtr_id,
       p.gender,
       cp.display_name,
       cp.avatar_ref AS club_avatar_ref
FROM club_players cp
LEFT JOIN shared_player_entries se ON se.id = cp.shared_entry_id
LEFT JOIN players p ON p.id = cp.player_id
LEFT JOIN profile_banners pb ON pb.id = p.banner_id
LEFT JOIN player_id_allocations a ON a.player_id = p.id
WHERE cp.id = ANY (@ids::uuid[]);

-- The signed-in Player's own account facts of the session card (playerStanding).
-- name: GetStandingPlayer :one
SELECT p.full_name, p.nickname, p.avatar_ref, a.rtr_id
FROM players p
LEFT JOIN player_id_allocations a ON a.player_id = p.id
WHERE p.id = @player_id;

-- The Player's own live roster entry of a session, through their club player in the entry's club.
-- name: GetOwnLiveEntry :one
SELECT sp.id
FROM session_players sp
JOIN club_players cp ON cp.club_id = sp.club_id AND cp.id = sp.club_player_id
WHERE sp.session_id = @session_id
  AND sp.released_at IS NULL
  AND sp.no_show_at IS NULL
  AND cp.player_id = @player_id
LIMIT 1;

-- The Player's latest join request of a session.
-- name: GetLatestJoinRequest :one
SELECT id, name, status, placement, club_player_id
FROM session_join_requests
WHERE session_id = @session_id AND player_id = @player_id
ORDER BY requested_at DESC, id DESC
LIMIT 1;

-- Club member (D-2026-11-12-02): a current saved player of the club that also has a club assessment (a level).
-- name: IsClubMemberWithLevel :one
SELECT EXISTS (
  SELECT 1
  FROM club_players cp
  JOIN club_assessments a ON a.club_id = cp.club_id AND a.club_player_id = cp.id
  WHERE cp.club_id = @club_id AND cp.player_id = @player_id AND cp.removed_at IS NULL
) AS is_member;

-- name: HasOpenDropOutNotice :one
SELECT EXISTS (
  SELECT 1 FROM session_drop_out_notices WHERE session_player_id = @session_player_id AND status = 'open'
) AS has_notice;

-- name: GetMyInviteCode :one
SELECT code FROM session_invite_codes WHERE session_id = @session_id AND player_id = @player_id;

-- The session's open match requests, oldest first, and their spots.
-- name: ListOpenMatchRequests :many
SELECT id, session_player_id, format::text AS format, requested_at
FROM session_match_requests
WHERE session_id = @session_id AND status = 'open'
ORDER BY requested_at ASC, id ASC;

-- name: ListOpenMatchRequestSpots :many
SELECT s.request_id, s.side::text AS side, s.slot_no, s.session_player_id
FROM session_match_request_spots s
JOIN session_match_requests r ON r.id = s.request_id
WHERE r.session_id = @session_id AND r.status = 'open';

-- Compare (P-COMPARE, #541): the shared final matches of two players, aggregated in one read. One row: the totals of
-- the three filters, the page the request lands on (clamped to the last one) and the page's games as JSON. Three games
-- a page.
-- name: ReadPlayerCompare :one
WITH shared AS MATERIALIZED (
  SELECT c.match_id::uuid AS match_id, c.format::text AS format, c.together::bool AS together, c.me_won::bool AS me_won,
         c.viewer_team::text AS viewer_team, c.team_a_score::int AS team_a_score, c.team_b_score::int AS team_b_score,
         c.finished_at::timestamptz AS finished_at, c.session_id::uuid AS session_id, c.session_title::text AS session_title,
         c.club_id::uuid AS club_id, c.club_name::text AS club_name, c.mine::jsonb AS mine, c.theirs::jsonb AS theirs
  FROM public.rotra_player_compare(@viewer_id::uuid, @other_id::uuid) AS c
), totals AS (
  SELECT count(*)::integer AS all_count,
    (count(*) FILTER (WHERE NOT together))::integer AS h2h_count,
    (count(*) FILTER (WHERE together))::integer AS together_count,
    (count(*) FILTER (WHERE me_won))::integer AS all_my_wins,
    (count(*) FILTER (WHERE NOT together AND me_won))::integer AS h2h_my_wins,
    (count(*) FILTER (WHERE together AND me_won))::integer AS together_my_wins
  FROM shared
), filtered AS (
  SELECT * FROM shared
  WHERE @filter::text = 'all' OR (@filter::text = 'h2h' AND NOT together)
    OR (@filter::text = 'together' AND together)
), paging AS (
  SELECT count(*)::integer AS total,
    least(@requested::bigint, greatest(0, (count(*) - 1) / 3))::integer AS page
  FROM filtered
), page_rows AS (
  SELECT * FROM filtered
  ORDER BY finished_at DESC, match_id
  LIMIT 3 OFFSET (SELECT page::bigint * 3 FROM paging)
)
SELECT totals.all_count, totals.h2h_count, totals.together_count,
  totals.all_my_wins, totals.h2h_my_wins, totals.together_my_wins,
  paging.page, paging.total,
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', match_id,
      'format', format,
      'mine', mine,
      'theirs', theirs,
      'meWon', me_won,
      'together', together,
      'score', CASE WHEN team_a_score IS NULL OR team_b_score IS NULL THEN NULL
        WHEN viewer_team = 'A' THEN team_a_score::text || '–' || team_b_score::text
        ELSE team_b_score::text || '–' || team_a_score::text END,
      'finishedAt', finished_at,
      'sessionId', session_id,
      'sessionTitle', session_title,
      'clubId', club_id,
      'clubName', club_name
    ) ORDER BY finished_at DESC, match_id) FROM page_rows
  ), '[]'::jsonb)::jsonb AS games
FROM totals CROSS JOIN paging;

-- name: ListSessionHostRows :many
-- The hosts a read shows (#1008, D-2026-11-22-01): the current rows of an open session, or the rows frozen when a finished session
-- ended. Oldest first.
SELECT h.club_player_id, h.name_snapshot
FROM session_hosts h
WHERE h.session_id = @session_id
  AND ((@ended::bool AND h.frozen_at IS NOT NULL) OR (NOT @ended::bool AND h.removed_at IS NULL))
ORDER BY h.assigned_at ASC, h.id ASC;

-- name: ListLatestAssessmentLevels :many
-- The latest assessment level of each saved player (a host who is not on the roster).
SELECT DISTINCT ON (club_player_id) club_player_id, skill_level_id
FROM club_assessments
WHERE club_player_id = ANY (@ids::uuid[])
ORDER BY club_player_id, assessed_at DESC;
