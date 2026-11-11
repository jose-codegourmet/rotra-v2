-- #717 (owner decisions November 11, 2026): the Queue Master's Set games played override, stored as an
-- adjustment (requested − games counted from completed matches at override time) so games keep counting
-- up afterwards. Displayed games played = counted + games_adjustment, floored at 0; the column may be
-- negative. Additive: one NOT NULL column with a default, so every existing row reads 0 (no override).
-- Drafted only; apply to a shared database after human sign-off.

-- AlterTable
ALTER TABLE "session_players"
  ADD COLUMN "games_adjustment" INTEGER NOT NULL DEFAULT 0;
