-- Q12.1 · On court, substitution game credit, court fill mode, Cancelled sessions, court planned
-- start (#409, epic #408). Column names settled by Jose on November 6, 2026.
-- DRAFT for review. Generated with `prisma migrate diff`, plus hand-written CHECKs and the updated
-- exclusion constraint and triggers. Not applied to any shared database; needs sign-off.
-- No behaviour change: existing rows stay valid, and every rewritten check accepts exactly what it
-- accepted before for the old states.
--
-- PostgreSQL (12+) allows ALTER TYPE … ADD VALUE inside the migration's transaction but refuses to
-- use a new value before that transaction commits ("unsafe use of new enum value"). So no CHECK,
-- index predicate or exclusion predicate below names 'on_court', 'cancelled' or 'closed': each one
-- lists the old values instead. Function bodies compare `state::text`, which never casts to the enum
-- and is only evaluated when the trigger runs.

-- CreateEnum
CREATE TYPE "substitution_credit" AS ENUM ('none', 'incoming', 'outgoing');

-- CreateEnum
CREATE TYPE "court_fill_mode" AS ENUM ('manual', 'auto');

-- AlterEnum
ALTER TYPE "match_state" ADD VALUE 'on_court';

-- AlterEnum
ALTER TYPE "join_request_status" ADD VALUE 'closed';

-- AlterEnum
ALTER TYPE "queue_session_state" ADD VALUE 'cancelled';

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "placed_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "match_participations" ADD COLUMN     "credit_to" "substitution_credit" NOT NULL DEFAULT 'none';

-- AlterTable
ALTER TABLE "queue_sessions" ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMPTZ(6),
ADD COLUMN     "court_fill_mode" "court_fill_mode" NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE "session_courts" ADD COLUMN     "opened_early_at" TIMESTAMPTZ(6),
ADD COLUMN     "starts_at" TIMESTAMPTZ(6);

-- queue_sessions: cancelled sessions never clash, never count as started, and carry their evidence.
-- Before: WHERE ("state" <> 'invalid'). Now invalid and cancelled sessions are both left out.
ALTER TABLE "queue_sessions" DROP CONSTRAINT "queue_sessions_no_overlap";
ALTER TABLE "queue_sessions"
  ADD CONSTRAINT "queue_sessions_no_overlap" EXCLUDE USING gist (
    "club_id" WITH =,
    tstzrange("scheduled_start_at", "scheduled_end_at") WITH &&
  ) WHERE ("state" IN ('prepared', 'active', 'finalizing', 'completed'));

-- Before: prepared or invalid, or started. Same for the old states; a cancelled session never started.
ALTER TABLE "queue_sessions" DROP CONSTRAINT "queue_sessions_started_check";
ALTER TABLE "queue_sessions"
  ADD CONSTRAINT "queue_sessions_started_check" CHECK (
    "state" NOT IN ('active', 'finalizing', 'completed') OR "started_at" IS NOT NULL
  ),
  -- cancelled_at is set exactly when the state is cancelled (the one value not listed), and only
  -- on a session that never started (cancel is allowed only from prepared).
  ADD CONSTRAINT "queue_sessions_cancelled_check" CHECK (
    ("cancelled_at" IS NULL) = ("state" IN ('prepared', 'active', 'finalizing', 'completed', 'invalid'))
    AND ("cancelled_at" IS NULL OR "started_at" IS NULL)
  ),
  -- Optional reason: null or 1–120 characters, only on a cancelled session.
  ADD CONSTRAINT "queue_sessions_cancel_reason_check" CHECK (
    "cancel_reason" IS NULL
    OR ("cancelled_at" IS NOT NULL AND length(btrim("cancel_reason")) > 0 AND char_length("cancel_reason") <= 120)
  );

-- session_courts: an early open needs a planned start; a set end is after a set start.
ALTER TABLE "session_courts"
  ADD CONSTRAINT "session_courts_opened_early_check" CHECK ("opened_early_at" IS NULL OR "starts_at" IS NOT NULL),
  ADD CONSTRAINT "session_courts_window_check" CHECK (
    "starts_at" IS NULL OR "open_until" IS NULL OR "open_until" > "starts_at"
  );

-- session_join_requests: `closed` carries a decision time like confirmed/declined, so the existing
-- "pending ⇔ no decision time" check already covers it.

-- matches: on_court has a placement time and no start; started_at is set only at Start match.
-- Before: started ⇔ not waiting. Same for the old states; on_court is not started.
ALTER TABLE "matches" DROP CONSTRAINT "matches_started_check";
ALTER TABLE "matches"
  ADD CONSTRAINT "matches_started_check" CHECK (
    ("state" IN ('active', 'completed', 'invalid')) = ("started_at" IS NOT NULL)
  ),
  -- Waiting ⇒ no placement time; on_court (the one value not listed) ⇒ placement time. Active and
  -- ended matches may lack one: they were started before the On court step existed.
  ADD CONSTRAINT "matches_placed_check" CHECK (
    "state" IN ('active', 'completed', 'invalid') OR (("state" = 'waiting') = ("placed_at" IS NULL))
  ),
  ADD CONSTRAINT "matches_placed_period_check" CHECK (
    "placed_at" IS NULL OR "started_at" IS NULL OR "started_at" >= "placed_at"
  );

-- match_participations: game credit sits on the incoming segment of an in-game substitution, which
-- never started with the match. The frozen trigger already freezes it once the match is decided.
ALTER TABLE "match_participations"
  ADD CONSTRAINT "match_participations_credit_check" CHECK ("credit_to" = 'none' OR NOT "started_with_match");

-- Lineups may still be edited while waiting or on_court (Replace player is a plain lineup change);
-- segments of a started match are never deleted. Before: only while waiting.
CREATE OR REPLACE FUNCTION "match_evidence_frozen"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target uuid := CASE WHEN TG_OP = 'INSERT' THEN NEW."match_id" ELSE OLD."match_id" END;
BEGIN
  IF EXISTS (SELECT 1 FROM "match_decisions" d WHERE d."match_id" = target) THEN
    RAISE EXCEPTION '% of decided match % is frozen', TG_TABLE_NAME, target USING ERRCODE = 'restrict_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (
      SELECT 1 FROM "matches" m WHERE m."id" = target AND m."state"::text NOT IN ('waiting', 'on_court')
    ) THEN
      RAISE EXCEPTION '% of started match % cannot be deleted', TG_TABLE_NAME, target USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Holds start at placement: a court or player hold may point at an on_court or active match.
-- Before: active only.
CREATE OR REPLACE FUNCTION "active_holds_require_active_match"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "matches" m WHERE m."id" = NEW."match_id" AND m."state"::text IN ('on_court', 'active')
  ) THEN
    RAISE EXCEPTION 'hold on % needs an on-court or active match', NEW."match_id" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- session_finalizations: neither an invalid nor a cancelled session is ever finalized.
-- Before: invalid only.
CREATE OR REPLACE FUNCTION "session_finalizations_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'finalizations are never deleted' USING ERRCODE = 'restrict_violation';
  END IF;
  IF TG_OP = 'INSERT' AND EXISTS (
    SELECT 1 FROM "queue_sessions" s
    WHERE s."id" = NEW."session_id" AND s."state"::text IN ('invalid', 'cancelled')
  ) THEN
    RAISE EXCEPTION 'an invalid or cancelled session has no finalization' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD."committed_at" IS NOT NULL AND (
    NEW."command_id", NEW."stream_manifest"::text, NEW."manifest_digest", NEW."accepted_session_revision",
    NEW."policy_version_id", NEW."committed_at", NEW."facts_digest"
  ) IS DISTINCT FROM (
    OLD."command_id", OLD."stream_manifest"::text, OLD."manifest_digest", OLD."accepted_session_revision",
    OLD."policy_version_id", OLD."committed_at", OLD."facts_digest"
  ) THEN
    RAISE EXCEPTION 'committed finalization % is frozen', OLD."session_id" USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- CREATE OR REPLACE keeps each function's existing grants (EXECUTE revoked from PUBLIC) and triggers.
