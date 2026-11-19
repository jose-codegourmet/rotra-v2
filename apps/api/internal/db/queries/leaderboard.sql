-- The Player banner picker: shown banners in upload order (readShownProfileBanners). The leaderboard, profile and
-- club reads use it to resolve the default banner for players who have not chosen one.
-- name: ListShownProfileBanners :many
SELECT id, image, is_default
FROM profile_banners
WHERE shown AND deleted_at IS NULL
ORDER BY uploaded_at ASC, number ASC;
