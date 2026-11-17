-- The public club page with no viewer, and the Player pickers and public numbers that sit beside it.
-- Ports of packages/db/src/player/{club-page,ranking-settings}.ts and packages/db/src/admin/profile-{banners,characters}.ts.
-- Reads only; nothing here calculates a rank.

-- name: GetClubPageClub :one
SELECT c.id, c.name, c.logo_ref, c.invite_code, l.display_name AS city
FROM clubs c
JOIN location_codes l ON l.id = c.founding_location_code_id
WHERE c.id = @club_id;

-- Registered members: current club players linked to a claimed profile that is not hidden from the directory.
-- Guests and unclaimed profiles never appear. The TypeScript has no ORDER BY (the database decides ties), so
-- the id is the tie-break here. The newest assessment decides the level; level 0 is a level, and -1 means no assessment.
-- name: ListClubPageMembers :many
SELECT cp.id,
       cp.display_name,
       p.full_name,
       p.avatar_ref,
       pb.id    AS banner_row_id,
       pb.image AS banner_image,
       COALESCE((SELECT a.skill_level_id
                 FROM club_assessments a
                 WHERE a.club_id = cp.club_id
                   AND a.club_player_id = cp.id
                 ORDER BY a.assessed_at DESC, a.id DESC
                 LIMIT 1), -1)::smallint AS skill_level_id
FROM club_players cp
JOIN players p ON p.id = cp.player_id
LEFT JOIN profile_banners pb ON pb.id = p.banner_id
WHERE cp.club_id = @club_id
  AND cp.removed_at IS NULL
  AND p.profile_state = 'claimed'
  AND NOT p.hidden_from_directory
ORDER BY cp.id ASC;

-- Cancelled and invalid sessions never appear. The page is soonest first.
-- name: ListClubPageSessions :many
SELECT s.id,
       s.title,
       s.state,
       s.scheduled_start_at,
       s.scheduled_end_at,
       s.public_slug,
       COALESCE(sp.state = 'deleted', false)::bool AS publication_deleted
FROM queue_sessions s
LEFT JOIN session_publications sp ON sp.session_id = s.id
WHERE s.club_id = @club_id
  AND s.state NOT IN ('cancelled', 'invalid')
ORDER BY s.scheduled_start_at ASC, s.id ASC;

-- Shown banners with every column the picker returns (readShownProfileBanners).
-- name: ListShownProfileBannerRows :many
SELECT id, image, shown, uploaded_at, number, is_default
FROM profile_banners
WHERE shown AND deleted_at IS NULL
ORDER BY uploaded_at ASC, number ASC;

-- The Player picture picker: shown library images in upload order (readShownProfileCharacters).
-- name: ListShownProfileCharacters :many
SELECT id, image, shown, uploaded_at, number
FROM profile_characters
WHERE shown AND deleted_at IS NULL
ORDER BY uploaded_at ASC, number ASC;

-- Any library row, hidden and deleted ones included: a player who already uses an image keeps it.
-- name: GetProfileCharacterImage :one
SELECT image
FROM profile_characters
WHERE id = @id::text;

-- Saved ranking settings, public numbers only (the Admin note and name stay out). The newest is in effect.
-- name: ListPublicRankingPolicies :many
SELECT version, effective_at, assessment_weight_bp, performance_weight_bp, recent_standard_match_threshold
FROM ranking_policy_versions
ORDER BY version ASC;
