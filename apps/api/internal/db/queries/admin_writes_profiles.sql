-- Admin profile banner and profile character writes (internal/adminwrites). Ports of packages/db/src/admin/
-- profile-banners.ts and profile-characters.ts. Every write runs in one transaction and takes the library's advisory
-- lock first, so the minimum-shown rule and the default never race.

-- ---- profile banners ----

-- name: LockProfileBanners :exec
-- The advisory lock every banner write takes. The key is the TypeScript's, so a Go write and a Next.js write of the
-- same moment run one after the other.
SELECT pg_advisory_xact_lock(hashtext('profile_banners'));

-- name: GetProfileBanner :one
-- findUnique by id, deleted rows included.
SELECT id, image, shown, uploaded_at, number, deleted_at, is_default FROM profile_banners WHERE id = $1;

-- name: GetDefaultProfileBanner :one
-- findFirst where is_default: at most one row has it (partial unique index), so no order is needed.
SELECT id, image, shown, uploaded_at, number, deleted_at, is_default FROM profile_banners WHERE is_default;

-- name: CountShownProfileBanners :one
SELECT count(*) FROM profile_banners WHERE shown AND deleted_at IS NULL;

-- name: SetProfileBannerShown :one
UPDATE profile_banners SET shown = $2 WHERE id = $1
RETURNING id, image, shown, uploaded_at, number, deleted_at, is_default;

-- name: SetProfileBannerDeletedAt :one
-- A delete sets the time (the application clock, as Prisma's new Date()), a restore clears it.
UPDATE profile_banners SET deleted_at = $2 WHERE id = $1
RETURNING id, image, shown, uploaded_at, number, deleted_at, is_default;

-- name: ClearProfileBannerDefaults :exec
UPDATE profile_banners SET is_default = false WHERE is_default;

-- name: SetProfileBannerDefault :one
UPDATE profile_banners SET is_default = true WHERE id = $1
RETURNING id, image, shown, uploaded_at, number, deleted_at, is_default;

-- ---- profile characters ----

-- name: LockProfileCharacters :exec
SELECT pg_advisory_xact_lock(hashtext('profile_characters'));

-- name: GetProfileCharacter :one
SELECT id, image, shown, uploaded_at, number, deleted_at FROM profile_characters WHERE id = $1;

-- name: CountShownProfileCharacters :one
SELECT count(*) FROM profile_characters WHERE shown AND deleted_at IS NULL;

-- name: SetProfileCharacterShown :one
UPDATE profile_characters SET shown = $2 WHERE id = $1
RETURNING id, image, shown, uploaded_at, number, deleted_at;

-- name: SetProfileCharacterDeletedAt :one
UPDATE profile_characters SET deleted_at = $2 WHERE id = $1
RETURNING id, image, shown, uploaded_at, number, deleted_at;
