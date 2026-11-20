-- Record games off keeps the night's results (D-2026-11-20-01, replacing "run only, keep nothing" in
-- D-2026-11-18-06). An unrecorded session's Match done now stores a winner and score like any other
-- session; only the leaderboard, win-rate and rank reads skip the session (service side, by
-- queue_sessions.record_games).
--
-- Only the guard trigger's function changes: every new completed decision needs a winner again,
-- whatever the session's record_games. match_decisions_kind_check stays as widened in
-- 20261119000100 (completed with a winner, or no winner and no score), so no-result rows written
-- under the November 19 rule stay valid; decisions are append-only, so no new ones can be added.
-- No table, column, constraint or row changes. Rollback: re-run the function body from 20261119000100.

-- Hand-written: same trigger, new body. A completed decision always has a winner.
CREATE OR REPLACE FUNCTION "match_decisions_record_games_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."kind" = 'completed' AND NEW."winning_team" IS NULL THEN
    RAISE EXCEPTION 'match % needs a winner', NEW."match_id" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION "match_decisions_record_games_guard"() FROM PUBLIC;
