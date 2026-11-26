-- Session level restrictions (D-2026-11-19-12, Q28.5 #1076): which levels may take a slot, one pick
-- per session, by level band. Additive: one NOT NULL enum column with a default (every existing
-- session reads All levels, no backfill) and three nullable slot counts used only by Slots per level.
-- Their sum equals the session's slots when saved; that check is in the service, since slots follow
-- the court count. Nothing is dropped or rewritten.

-- CreateEnum
CREATE TYPE "level_restriction" AS ENUM ('all', 'beginners', 'beginners_intermediate', 'slots_per_band');

-- AlterTable
ALTER TABLE "queue_sessions" ADD COLUMN     "level_restriction" "level_restriction" NOT NULL DEFAULT 'all',
ADD COLUMN     "beginner_slots" INTEGER,
ADD COLUMN     "intermediate_slots" INTEGER,
ADD COLUMN     "advanced_slots" INTEGER;

-- Hand-written: the three slot counts are set together, exactly when the pick is Slots per level,
-- and each is 0 or more.
ALTER TABLE "queue_sessions" ADD CONSTRAINT "queue_sessions_level_slots_check" CHECK (
  CASE WHEN "level_restriction" = 'slots_per_band'
    THEN "beginner_slots" IS NOT NULL AND "intermediate_slots" IS NOT NULL AND "advanced_slots" IS NOT NULL
      AND "beginner_slots" >= 0 AND "intermediate_slots" >= 0 AND "advanced_slots" >= 0
    ELSE "beginner_slots" IS NULL AND "intermediate_slots" IS NULL AND "advanced_slots" IS NULL
  END
);
