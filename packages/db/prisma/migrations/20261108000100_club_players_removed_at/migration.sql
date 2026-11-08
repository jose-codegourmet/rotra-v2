-- Q-SAVED-PLAYERS · Delete player (owner decision and migration sign-off, November 8, 2026).
-- Soft delete: history (session_players, facts, summaries, assessments) keeps pointing at the row,
-- so a deleted saved player is only marked. Additive and nullable; no existing row changes.

-- AlterTable
ALTER TABLE "club_players" ADD COLUMN "removed_at" TIMESTAMPTZ(6);

-- Saved players lists only the club's current players.
CREATE INDEX "club_players_club_id_current_idx" ON "club_players" ("club_id", "display_name", "id")
  WHERE "removed_at" IS NULL;
