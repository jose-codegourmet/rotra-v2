-- The signed-in Player's own writes (go-writes-admin-player, Player slice): ports of the services in
-- packages/db/src/player/{profile,notifications,my-clubs,contact-change}.ts. Prisma stamps `updated_at` (@updatedAt) with the
-- application clock on every update, so each update here takes it as @now, as the Admin writes do.

-- name: GetPlayerPrivacy :one
-- tx.player.findUniqueOrThrow, no lock: the four privacy switches read the row and write it back, as the service does.
SELECT revision, hide_phone_from_clubs, profile_visibility, hidden_from_directory, show_profile_stats, show_weekly_performance
FROM players
WHERE id = @id;

-- name: SetPlayerPhoneHidden :exec
UPDATE players SET hide_phone_from_clubs = @hidden, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: SetPlayerProfileVisibility :exec
UPDATE players SET profile_visibility = @visibility::profile_visibility, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: SetPlayerHiddenFromDirectory :exec
UPDATE players SET hidden_from_directory = @hidden, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: SetPlayerStatsVisibility :exec
-- A switch that is not changing is passed as null and keeps its value; nothing changed is not a write.
UPDATE players
SET show_profile_stats = COALESCE(sqlc.narg('show_profile_stats')::boolean, show_profile_stats),
    show_weekly_performance = COALESCE(sqlc.narg('show_weekly_performance')::boolean, show_weekly_performance),
    revision = revision + 1, updated_at = @now
WHERE id = @id;

-- name: LockPlayerBanner :one
-- SELECT "id" FROM "players" ... FOR UPDATE, then findUniqueOrThrow: no row is not_found.
SELECT revision, banner_id FROM players WHERE id = @id FOR UPDATE;

-- name: SetPlayerBanner :exec
UPDATE players SET banner_id = @banner_id, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: IsProfileBannerPickable :one
-- isProfileBannerPickable: the banner exists, is shown and is not deleted.
SELECT EXISTS (SELECT 1 FROM profile_banners WHERE id = @id AND shown AND deleted_at IS NULL)::boolean AS pickable;

-- name: MarkMyNotificationsRead :execrows
-- updateMany of markPlayerNotificationsRead: the player's unread notifications inside the visible window, all of them or
-- the one id.
UPDATE player_notifications SET read_at = @now
WHERE player_id = @player_id AND created_at > @since AND read_at IS NULL
  AND (sqlc.narg('id')::uuid IS NULL OR id = sqlc.narg('id')::uuid);

-- name: FindVisibleNotification :one
SELECT id FROM player_notifications
WHERE player_id = @player_id AND created_at > @since AND id = @id;

-- name: MarkVerificationReminderRead :exec
-- The first mark wins (the reminder is state-derived, so its read time lives on the account).
UPDATE player_accounts SET verification_reminder_read_at = @now, updated_at = @now
WHERE player_id = @player_id AND verification_reminder_read_at IS NULL;

-- name: FindClubWithInvite :one
-- requireClubInvite: the club whose current code this is.
SELECT id FROM clubs WHERE id = @id AND invite_code = @code LIMIT 1;

-- name: ClubExists :one
SELECT id FROM clubs WHERE id = @id;

-- name: GetClubPlayerLink :one
SELECT id, removed_at FROM club_players WHERE club_id = @club_id AND player_id = @player_id;

-- name: ReviveClubPlayer :exec
-- Join again after leaving: the row comes back, the history keeps one row per club and player.
UPDATE club_players SET removed_at = NULL, revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: GetPlayerNames :one
SELECT full_name, nickname FROM players WHERE id = @id;

-- name: InsertSavedClubPlayer :exec
-- tx.clubPlayer.create of joinInTransaction: the player saved to the club, under their own name and nickname.
INSERT INTO club_players (id, club_id, player_id, display_name, nickname, added_at, created_at, updated_at)
VALUES (@id, @club_id, @player_id, @display_name, @nickname, @now, @now, @now);

-- name: RemoveClubPlayer :exec
-- leaveMyClub: the row stays for history.
UPDATE club_players SET removed_at = @now, revision = revision + 1, updated_at = @now
WHERE club_id = @club_id AND player_id = @player_id AND removed_at IS NULL;
