-- D-2026-11-09-12 (owner answers of November 10, 2026): the club sets the picture of its own guest
-- or unclaimed player, stored on the saved-player record. `avatar_ref` is a photo URL in the
-- `player-avatars` bucket (under `clubs/`), `character:<id>`, or null for initials;
-- `avatar_previous_ref` is the one previous photo kept (keep-two rule of D-2026-11-09-10).

-- AlterTable
ALTER TABLE "club_players" ADD COLUMN "avatar_ref" TEXT,
ADD COLUMN "avatar_previous_ref" TEXT;
