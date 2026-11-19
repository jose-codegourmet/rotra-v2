-- Record games (D-2026-11-18-06, Q23.8 #976): a Queue Session can run without recording its games.
-- 1. queue_sessions.record_games: additive, default true, so every existing session reads as recorded
--    with no backfill. Fixed once the session is no longer prepared (trigger, like the level lock).
-- 2. match_decisions: Match done on an unrecorded session is a completed decision with no winner and
--    no score. The kind CHECK is replaced by a wider one (every existing row still passes), and a
--    trigger ties the no-result shape to the session's record_games.
-- Nothing is dropped except that one CHECK, which is re-added wider in the same statement. No row is
-- rewritten or backfilled.

-- AlterTable
ALTER TABLE "queue_sessions" ADD COLUMN     "record_games" BOOLEAN NOT NULL DEFAULT true;

-- Hand-written: Record games can change only while the session is prepared ("until start").
CREATE FUNCTION "queue_sessions_record_games_lock"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."state" <> 'prepared' THEN
    RAISE EXCEPTION 'session % has started: record_games is fixed', OLD."id" USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION "queue_sessions_record_games_lock"() FROM PUBLIC;
CREATE TRIGGER "queue_sessions_record_games_lock"
  BEFORE UPDATE ON "queue_sessions"
  FOR EACH ROW
  WHEN (NEW."record_games" IS DISTINCT FROM OLD."record_games")
  EXECUTE FUNCTION "queue_sessions_record_games_lock"();

-- Hand-written: a completed decision may now have no winner (and then no score). Before: completed
-- always needed a winner. Invalid is unchanged: no winner, no score.
ALTER TABLE "match_decisions"
  DROP CONSTRAINT "match_decisions_kind_check",
  ADD CONSTRAINT "match_decisions_kind_check" CHECK (
    ("kind" = 'completed' AND "winning_team" IS NOT NULL)
    OR ("winning_team" IS NULL AND "team_a_score" IS NULL AND "team_b_score" IS NULL)
  );

-- Hand-written: which shape a completed decision takes follows the session. A recorded session
-- always stores a winner; an unrecorded session never stores a winner or a score. Decisions are
-- append-only (match_decisions_append_only), so INSERT is the only write to guard.
CREATE FUNCTION "match_decisions_record_games_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  recorded boolean;
BEGIN
  SELECT s."record_games" INTO recorded FROM "queue_sessions" s WHERE s."id" = NEW."session_id";
  IF recorded IS NOT FALSE AND NEW."kind" = 'completed' AND NEW."winning_team" IS NULL THEN
    RAISE EXCEPTION 'match % needs a winner: its session records games', NEW."match_id" USING ERRCODE = 'check_violation';
  END IF;
  IF recorded IS FALSE AND NEW."winning_team" IS NOT NULL THEN
    RAISE EXCEPTION 'match % takes no result: its session does not record games', NEW."match_id" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION "match_decisions_record_games_guard"() FROM PUBLIC;
CREATE TRIGGER "match_decisions_record_games_guard"
  BEFORE INSERT ON "match_decisions"
  FOR EACH ROW EXECUTE FUNCTION "match_decisions_record_games_guard"();
