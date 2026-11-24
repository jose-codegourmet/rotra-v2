-- P18.8 (#1089, D-2026-11-19-01). Optional public gender on the player. Additive: every existing
-- row stays null ("not added"); no backfill.
BEGIN;

CREATE TYPE "player_gender" AS ENUM ('male', 'female');

ALTER TABLE "players" ADD COLUMN "gender" "player_gender";

COMMIT;
