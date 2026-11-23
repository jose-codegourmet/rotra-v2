-- Saved players: the level the club gives a saved player outside a session (Saved players › Add
-- player and Edit details, owner request of November 23, 2026). Session assessments stay in
-- club_assessments; Saved players show whichever is newer.

-- AlterTable
ALTER TABLE "club_players" ADD COLUMN "saved_level_at" TIMESTAMPTZ(6),
ADD COLUMN "saved_skill_level_id" SMALLINT;

-- AddForeignKey
ALTER TABLE "club_players" ADD CONSTRAINT "club_players_saved_skill_level_id_fkey" FOREIGN KEY ("saved_skill_level_id") REFERENCES "skill_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written: the level and its time are set together.
ALTER TABLE "club_players" ADD CONSTRAINT "club_players_saved_level_check" CHECK (("saved_skill_level_id" IS NULL) = ("saved_level_at" IS NULL));
