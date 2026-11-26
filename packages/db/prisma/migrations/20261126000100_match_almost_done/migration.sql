-- Almost done (D-2026-11-25-02; Q29.4, #1122): when the Queue Master switched a Playing match to
-- Almost done; null when off. Plan Ahead reads it as 0 minutes left. Only a Playing (active) match
-- carries it: the Match done, Mark invalid and Pause match commands clear it in the same UPDATE as
-- the state change, and the check refuses anything else. Never part of decisions, facts, results
-- or any public read.
BEGIN;

ALTER TABLE "matches"
  ADD COLUMN "almost_done_at" TIMESTAMPTZ(6);

ALTER TABLE "matches"
  ADD CONSTRAINT "matches_almost_done_check" CHECK ("almost_done_at" IS NULL OR "state" = 'active');

COMMIT;
