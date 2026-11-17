-- P-LEADERBOARD public reads, from the stored player_rank_current projection only: no rank is calculated here.
-- A row is listed when it is eligible, has a stored rank and level, and was produced by an approved
-- algorithm version (@algorithms; empty until #247, and then the caller never runs these).
-- Order: rank high to low, then player id, as the Route Handler's readLeaderboardPage does.

-- name: ListLeaderboardPage :many
SELECT prc.player_id,
       sl.code          AS level_code,
       p.full_name,
       p.nickname,
       p.avatar_ref,
       p.profile_visibility,
       pb.id            AS banner_id,
       pb.image         AS banner_image
FROM player_rank_current prc
JOIN players p ON p.id = prc.player_id
JOIN skill_levels sl ON sl.id = prc.skill_level_id
LEFT JOIN profile_banners pb ON pb.id = p.banner_id
WHERE prc.leaderboard_eligible
  AND prc.numeric_rank IS NOT NULL
  AND prc.skill_level_id IS NOT NULL
  AND prc.algorithm_version = ANY (@algorithms::text[])
ORDER BY prc.numeric_rank DESC, prc.player_id ASC
OFFSET @row_offset::bigint
LIMIT @row_limit::int;

-- name: CountLeaderboard :one
SELECT count(*)
FROM player_rank_current prc
WHERE prc.leaderboard_eligible
  AND prc.numeric_rank IS NOT NULL
  AND prc.skill_level_id IS NOT NULL
  AND prc.algorithm_version = ANY (@algorithms::text[]);

-- Name or nickname search over listed players. Always-private players are left out of the matches (but
-- still count for positions, which are over every listed row). The pattern is NOT escaped: %, _ and \ in
-- the query act as ILIKE wildcards, exactly as Prisma's `contains` does today (characterized, see the
-- search_percent_* and search_underscore_* cases).
-- name: SearchLeaderboard :many
WITH listed AS (
  SELECT prc.player_id,
         prc.skill_level_id,
         row_number() OVER (ORDER BY prc.numeric_rank DESC, prc.player_id ASC) AS position
  FROM player_rank_current prc
  WHERE prc.leaderboard_eligible
    AND prc.numeric_rank IS NOT NULL
    AND prc.skill_level_id IS NOT NULL
    AND prc.algorithm_version = ANY (@algorithms::text[])
)
SELECT l.player_id,
       l.position::bigint AS position,
       sl.code            AS level_code,
       p.full_name,
       p.nickname,
       p.avatar_ref,
       p.profile_visibility,
       pb.id              AS banner_id,
       pb.image           AS banner_image
FROM listed l
JOIN players p ON p.id = l.player_id
JOIN skill_levels sl ON sl.id = l.skill_level_id
LEFT JOIN profile_banners pb ON pb.id = p.banner_id
WHERE p.profile_visibility <> 'always_private'
  AND (p.full_name ILIKE '%' || @query::text || '%' OR p.nickname ILIKE '%' || @query::text || '%')
ORDER BY l.position
LIMIT 50;

-- name: CountLeaderboardSearch :one
SELECT count(*)
FROM player_rank_current prc
JOIN players p ON p.id = prc.player_id
WHERE prc.leaderboard_eligible
  AND prc.numeric_rank IS NOT NULL
  AND prc.skill_level_id IS NOT NULL
  AND prc.algorithm_version = ANY (@algorithms::text[])
  AND p.profile_visibility <> 'always_private'
  AND (p.full_name ILIKE '%' || @query::text || '%' OR p.nickname ILIKE '%' || @query::text || '%');

-- The Player banner picker: shown banners in upload order (readShownProfileBanners). The leaderboard uses
-- it only to resolve the default banner for players who have not chosen one.
-- name: ListShownProfileBanners :many
SELECT id, image, is_default
FROM profile_banners
WHERE shown AND deleted_at IS NULL
ORDER BY uploaded_at ASC, number ASC;
