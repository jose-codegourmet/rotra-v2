-- The period leaderboards (D-2026-11-16-05): wins from recorded match facts. Ports of readPeriodLeaderboard in
-- packages/db/src/player/leaderboard.ts. Reads only.

-- Every fact of a standard, fully played, valid match of a finished and committed session in the two windows
-- (the previous period and the current one). A fact counts for the identity recorded at finalization and for every
-- player a reviewed link (an unrevoked attribution) points its club record to.
-- name: ListBoardFacts :many
SELECT f.played_at,
       f.team,
       f.winning_team,
       f.player_id_at_finalization,
       ARRAY(SELECT h.player_id
             FROM player_history_attributions h
             WHERE h.club_id = f.club_id
               AND h.club_player_id = f.club_player_id
               AND h.revoked_at IS NULL)::uuid[] AS attributed
FROM player_match_facts f
JOIN session_finalizations fin ON fin.club_id = f.club_id AND fin.session_id = f.session_id
JOIN queue_sessions qs ON qs.id = f.session_id
JOIN match_decisions d ON d.club_id = f.club_id AND d.session_id = f.session_id AND d.match_id = f.match_id
JOIN matches m ON m.club_id = d.club_id AND m.session_id = d.session_id AND m.id = d.match_id
WHERE f.played_at >= @from_at
  AND f.played_at <= @to_at
  AND f.format IN ('singles', 'doubles')
  AND f.full_participation
  AND f.standard_match
  AND d.kind = 'completed'
  AND m.state = 'completed'
  AND fin.committed_at IS NOT NULL
  AND qs.state = 'completed';

-- The players of those facts that have a permanent RTR ID. For an unclaimed player the clubs that currently save
-- them are counted (one club: that club's name and nickname stand in for them; more: they do not qualify).
-- name: ListBoardPlayers :many
SELECT p.id,
       p.full_name,
       p.nickname,
       p.avatar_ref,
       p.profile_visibility,
       (p.profile_state = 'unclaimed')::bool AS is_unclaimed,
       pb.id    AS banner_id,
       pb.image AS banner_image,
       rc.skill_level_id,
       (SELECT count(*)
        FROM club_players cp
        WHERE cp.player_id = p.id AND cp.removed_at IS NULL AND p.profile_state = 'unclaimed')::int AS saving_clubs,
       COALESCE((SELECT cp.display_name
                 FROM club_players cp
                 WHERE cp.player_id = p.id AND cp.removed_at IS NULL AND p.profile_state = 'unclaimed'
                 ORDER BY cp.id ASC
                 LIMIT 1), '')::text AS club_display_name,
       (SELECT cp.nickname
        FROM club_players cp
        WHERE cp.player_id = p.id AND cp.removed_at IS NULL AND p.profile_state = 'unclaimed'
        ORDER BY cp.id ASC
        LIMIT 1) AS club_nickname
FROM players p
JOIN player_id_allocations a ON a.player_id = p.id
LEFT JOIN profile_banners pb ON pb.id = p.banner_id
LEFT JOIN player_rank_current rc ON rc.player_id = p.id
WHERE p.id = ANY (@ids::uuid[]);

-- The newest Admin edit of a claimed profile since it was claimed: "Changed by ROTRA Admin" (adminChangeNoteOf).
-- name: GetAdminChangeReason :one
SELECT e.metadata
FROM admin_audit_events e
JOIN player_accounts pa ON pa.player_id = @player_id
JOIN players p ON p.id = pa.player_id AND p.profile_state = 'claimed'
WHERE e.target_type = 'player'
  AND e.target_id = @player_id::text
  AND e.action IN ('player.profile_updated', 'player.password_set')
  AND e.occurred_at >= pa.claimed_at
ORDER BY e.occurred_at DESC, e.id DESC
LIMIT 1;

-- Stats by RTR ID for the Queue session page (#731): the player behind the RTR ID, if any.
-- name: GetStatsTarget :one
SELECT a.player_id, p.profile_state = 'claimed' AS is_claimed, p.show_profile_stats
FROM player_id_allocations a
JOIN players p ON p.id = a.player_id
WHERE a.rtr_id = @rtr_id::text;

-- The open shared entry of an unclaimed person, and every club record under it.
-- name: ListOpenSharedEntryRecords :many
SELECT cp.id, cp.club_id
FROM shared_player_entries e
LEFT JOIN club_players cp ON cp.shared_entry_id = e.id
WHERE e.rtr_id = @rtr_id::text
  AND e.claimed_player_id IS NULL
  AND e.retired_at IS NULL
ORDER BY cp.id ASC;

-- The facts of one club record (readClubPlayerMatchHistory), the same columns as ListPlayerFacts.
-- name: ListClubPlayerFacts :many
SELECT f.session_id,
       f.match_id,
       f.session_player_id,
       f.format,
       f.team,
       f.winning_team,
       f.full_participation,
       f.standard_match,
       f.partner_entry_ids,
       f.opponent_entry_ids,
       f.team_a_score,
       f.team_b_score
FROM player_match_facts f
WHERE f.club_id = @club_id
  AND f.club_player_id = @club_player_id
ORDER BY f.played_at DESC, f.match_id ASC;
