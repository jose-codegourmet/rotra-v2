-- Public player page reads: profile, find by RTR ID, clubs, rank projection and match history.
-- Ports of packages/db/src/player/{profile,player-clubs,projections}.ts. Reads only; nothing here calculates a rank.

-- A profile is public only with a permanent RTR ID, hence the inner join on the allocation.
-- name: GetPublicProfile :one
SELECT p.id,
       a.rtr_id,
       p.full_name,
       p.nickname,
       p.avatar_ref,
       p.banner_id,
       p.profile_visibility,
       p.show_profile_stats,
       p.show_weekly_performance,
       p.experience_months,
       p.experience_recorded_at,
       p.personal_details,
       p.profile_state = 'unclaimed' AS is_unclaimed,
       p.gender,
       (p.profile_state = 'claimed' AND ac.player_id IS NOT NULL)::boolean AS has_account,
       ac.google_email,
       pc.email AS contact_email,
       pc.phone_e164 AS contact_phone,
       COALESCE(p.verification_override = 'verified', false)::boolean AS verified_override,
       pb.id    AS banner_row_id,
       pb.image AS banner_image
FROM players p
JOIN player_id_allocations a ON a.player_id = p.id
LEFT JOIN profile_banners pb ON pb.id = p.banner_id
LEFT JOIN player_accounts ac ON ac.player_id = p.id
LEFT JOIN player_private_contacts pc ON pc.player_id = p.id
WHERE p.id = @player_id;

-- name: ListPlayerSocialLinks :many
SELECT provider, url
FROM player_social_links
WHERE player_id = @player_id;

-- The clubs that currently save an unclaimed player (D-2026-11-16-04): the club's own name and nickname for them.
-- Only an unclaimed profile has any. The order is the club player id; it only matters when there is exactly one.
-- name: ListUnclaimedSavers :many
SELECT cp.display_name, cp.nickname, c.name AS club_name
FROM club_players cp
JOIN players p ON p.id = cp.player_id AND p.profile_state = 'unclaimed'
JOIN clubs c ON c.id = cp.club_id
WHERE cp.player_id = @player_id
  AND cp.removed_at IS NULL
ORDER BY cp.id ASC;

-- B-53: a player hidden from Player Information has no RTR ID lookup, for every caller.
-- name: FindPlayerIDByRTR :one
SELECT a.player_id, p.hidden_from_directory
FROM player_id_allocations a
JOIN players p ON p.id = a.player_id
WHERE a.rtr_id = @rtr_id::text;

-- name: GetPublicClubsVisibility :one
SELECT p.profile_visibility
FROM players p
JOIN player_id_allocations a ON a.player_id = p.id
WHERE p.id = @player_id;

-- club_players is unique per (club, player), so a club is listed at most once.
-- name: ListPlayerClubs :many
SELECT c.id, c.name, c.logo_ref
FROM club_players cp
JOIN clubs c ON c.id = cp.club_id
WHERE cp.player_id = @player_id
  AND cp.removed_at IS NULL
ORDER BY cp.added_at ASC, cp.id ASC;

-- The stored projection exactly as written. A public profile with no rank row is still returned (has_rank false).
-- name: GetPlayerRank :one
SELECT p.full_name,
       p.nickname,
       p.profile_visibility,
       (r.player_id IS NOT NULL)::bool AS has_rank,
       COALESCE(r.algorithm_version, '')::text AS algorithm_version,
       r.state,
       r.recent_standard_match_count,
       sl.display_order
FROM players p
JOIN player_id_allocations a ON a.player_id = p.id
LEFT JOIN player_rank_current r ON r.player_id = p.id
LEFT JOIN skill_levels sl ON sl.id = r.skill_level_id
WHERE p.id = @player_id;

-- Facts that belong to a player: their own snapshots plus confirmed, unrevoked guest history (playerFacts).
-- The same fact is never listed twice: (match_id, session_player_id) is unique.
-- name: CountPlayerCountedFacts :one
SELECT count(*)
FROM player_match_facts f
WHERE (f.player_id_at_finalization = @player_id
       OR EXISTS (SELECT 1
                  FROM player_history_attributions h
                  WHERE h.player_id = @player_id
                    AND h.revoked_at IS NULL
                    AND h.club_id = f.club_id
                    AND h.club_player_id = f.club_player_id))
  AND f.full_participation
  AND f.standard_match;

-- The latest session of the player whose rank job has not finished. A session never finalized sorts first
-- (Postgres puts NULL first in descending order, as the Prisma query does).
-- name: GetPendingRankSession :one
SELECT qs.title, c.name AS club_name, qs.finalized_at
FROM queue_sessions qs
JOIN clubs c ON c.id = qs.club_id
WHERE qs.id IN (
  SELECT pj.source_finalization_id
  FROM projection_jobs pj
  WHERE pj.kind = 'player_rank'
    AND pj.status IN ('pending', 'running', 'failed')
    AND pj.source_finalization_id IN (
      SELECT f.session_id
      FROM player_match_facts f
      WHERE f.player_id_at_finalization = @player_id
         OR EXISTS (SELECT 1
                    FROM player_history_attributions h
                    WHERE h.player_id = @player_id
                      AND h.revoked_at IS NULL
                      AND h.club_id = f.club_id
                      AND h.club_player_id = f.club_player_id)))
ORDER BY qs.finalized_at DESC, qs.id ASC
LIMIT 1;

-- The visibility of any player, with or without an RTR ID (the games read masks by it).
-- name: GetPlayerVisibility :one
SELECT profile_visibility
FROM players
WHERE id = @player_id;

-- name: ListPlayerFacts :many
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
WHERE f.player_id_at_finalization = @player_id
   OR EXISTS (SELECT 1
              FROM player_history_attributions h
              WHERE h.player_id = @player_id
                AND h.revoked_at IS NULL
                AND h.club_id = f.club_id
                AND h.club_player_id = f.club_player_id)
ORDER BY f.played_at DESC, f.match_id ASC;

-- Valid finalized sessions only.
-- name: ListCompletedSessions :many
SELECT qs.id,
       qs.title,
       c.name AS club_name,
       qs.finalized_at,
       qs.public_slug,
       qs.record_games,
       sp.published_at
FROM queue_sessions qs
JOIN clubs c ON c.id = qs.club_id
LEFT JOIN session_publications sp ON sp.session_id = qs.id
WHERE qs.id = ANY (@session_ids::uuid[])
  AND qs.state = 'completed';

-- name: ListSessionEntries :many
SELECT e.id,
       e.name_snapshot,
       pl.id                  AS player_id,
       pl.avatar_ref,
       pl.profile_visibility,
       (a.player_id IS NOT NULL)::bool AS has_rtr_id
FROM session_players e
LEFT JOIN players pl ON pl.id = e.player_id_at_entry
LEFT JOIN player_id_allocations a ON a.player_id = pl.id
WHERE e.session_id = ANY (@session_ids::uuid[]);

-- The games badge: how many games an entry had played in its session up to and including each match.
-- name: ListSessionGameNumbers :many
SELECT f.session_id,
       f.session_player_id,
       f.match_id,
       (row_number() OVER (PARTITION BY f.session_id, f.session_player_id ORDER BY f.played_at ASC, f.match_id ASC))::int AS game_number
FROM player_match_facts f
WHERE f.session_id = ANY (@session_ids::uuid[]);

-- name: ListPlayerHostClubIDs :many
-- readHostClubIds: the clubs where the player is a current trusted host: a current trusted-host row on a current saved player linked to
-- the player, or on a deleted record the Queue Master moved into that linked record (the Same person step).
SELECT DISTINCT t.club_id
FROM club_trusted_hosts t
JOIN club_players cp ON cp.club_id = t.club_id AND cp.id = t.club_player_id
WHERE t.removed_at IS NULL
  AND ((cp.player_id = @player_id AND cp.removed_at IS NULL)
    OR (cp.removed_at IS NOT NULL AND EXISTS (
          SELECT 1 FROM club_players l
          WHERE l.club_id = cp.club_id AND l.id = cp.linked_to_club_player_id AND l.player_id = @player_id AND l.removed_at IS NULL)));
