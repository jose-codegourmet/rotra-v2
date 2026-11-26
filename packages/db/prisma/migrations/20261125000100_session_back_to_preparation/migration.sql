-- Back to preparation (2026-11-25-queue-back-to-preparation, owner November 25, 2026): undo Start
-- while no game has started.
-- 1. queue_sessions.planned_start_before_start_at / planned_end_before_start_at: the planned window
--    as it was at Start, before a late or other-day start moved it. Additive and nullable: sessions
--    started before this migration have none, and going back then keeps their current planned times.
-- 2. session_players_level_lock: a locked level may now be unlocked (level_locked_at back to null,
--    level and assessment unchanged) only while the entry's session is prepared and has no start
--    time, which only Back to preparation produces. Every other locked-level rule is unchanged.
-- Nothing is dropped, rewritten or backfilled.

-- AlterTable
ALTER TABLE "queue_sessions" ADD COLUMN     "planned_start_before_start_at" TIMESTAMPTZ(6),
ADD COLUMN     "planned_end_before_start_at" TIMESTAMPTZ(6);

-- Hand-written: the pre-Start window is kept as a pair.
ALTER TABLE "queue_sessions"
  ADD CONSTRAINT "queue_sessions_before_start_pair_check" CHECK (
    ("planned_start_before_start_at" IS NULL) = ("planned_end_before_start_at" IS NULL)
  );

-- Hand-written: the level lock, with the one unlock Back to preparation needs.
CREATE OR REPLACE FUNCTION "session_players_level_lock"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."level_locked_at" IS NOT NULL
    AND NEW."level_locked_at" IS NULL
    AND NEW."skill_level_id" IS NOT DISTINCT FROM OLD."skill_level_id"
    AND NEW."assessment_id" IS NOT DISTINCT FROM OLD."assessment_id"
    AND NEW."released_at" IS NULL
    AND EXISTS (
      SELECT 1 FROM "queue_sessions" s
      WHERE s."id" = NEW."session_id" AND s."state" = 'prepared' AND s."started_at" IS NULL
    )
  THEN
    RETURN NEW;
  END IF;
  IF OLD."level_locked_at" IS NOT NULL AND (
    NEW."skill_level_id" IS DISTINCT FROM OLD."skill_level_id"
    OR NEW."assessment_id" IS DISTINCT FROM OLD."assessment_id"
    OR NEW."level_locked_at" IS DISTINCT FROM OLD."level_locked_at"
    OR NEW."released_at" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'session player % has a locked level', OLD."id" USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
