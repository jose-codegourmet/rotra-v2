-- F07.14 · matches, participation segments, occupancy and permanent decisions (#255)
-- DRAFT for review. Generated with `prisma migrate diff`, plus hand-written CHECKs, hold guards and
-- permanence triggers. Not applied to any shared database; needs sign-off.
-- Open: offline match_no allocation, conflict authority, closure of unplayed waiting matches (#246).

-- CreateEnum
CREATE TYPE "match_state" AS ENUM ('waiting', 'active', 'completed', 'invalid');

-- CreateEnum
CREATE TYPE "match_format" AS ENUM ('singles', 'doubles', 'fun_1v2', 'fun_3v3', 'fun_4v4', 'fun_5v5');

-- CreateEnum
CREATE TYPE "match_origin" AS ENUM ('manual', 'suggested', 'auto');

-- CreateEnum
CREATE TYPE "team_side" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "match_decision_kind" AS ENUM ('completed', 'invalid');

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "match_no" INTEGER NOT NULL,
    "state" "match_state" NOT NULL DEFAULT 'waiting',
    "format" "match_format" NOT NULL,
    "queue_position" BIGINT,
    "removed_at" TIMESTAMPTZ(6),
    "origin" "match_origin" NOT NULL,
    "manual_protected" BOOLEAN NOT NULL DEFAULT false,
    "generation_id" UUID,
    "source_operation_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_participations" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "session_player_id" UUID NOT NULL,
    "team" "team_side" NOT NULL,
    "segment_no" INTEGER NOT NULL,
    "joined_operation_id" UUID NOT NULL,
    "left_operation_id" UUID,
    "joined_at" TIMESTAMPTZ(6) NOT NULL,
    "left_at" TIMESTAMPTZ(6),
    "started_with_match" BOOLEAN NOT NULL DEFAULT false,
    "finished_with_match" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "match_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_court_usage" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "court_id" UUID NOT NULL,
    "acquired_at" TIMESTAMPTZ(6) NOT NULL,
    "released_at" TIMESTAMPTZ(6),
    "acquire_operation_id" UUID NOT NULL,
    "release_operation_id" UUID,

    CONSTRAINT "match_court_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "active_court_holds" (
    "court_id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "held_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "active_court_holds_pkey" PRIMARY KEY ("court_id")
);

-- CreateTable
CREATE TABLE "active_player_holds" (
    "session_player_id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "player_id" UUID,
    "held_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "active_player_holds_pkey" PRIMARY KEY ("session_player_id")
);

-- CreateTable
CREATE TABLE "match_decisions" (
    "match_id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "kind" "match_decision_kind" NOT NULL,
    "winning_team" "team_side",
    "team_a_score" INTEGER,
    "team_b_score" INTEGER,
    "source_operation_id" UUID NOT NULL,
    "confirmed_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_club_id" UUID NOT NULL,
    "device_id" UUID,

    CONSTRAINT "match_decisions_pkey" PRIMARY KEY ("match_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "matches_source_operation_id_key" ON "matches"("source_operation_id");

-- CreateIndex
CREATE INDEX "matches_session_id_state_queue_position_id_idx" ON "matches"("session_id", "state", "queue_position", "id");

-- CreateIndex
CREATE UNIQUE INDEX "matches_club_id_session_id_id_key" ON "matches"("club_id", "session_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "matches_session_id_match_no_key" ON "matches"("session_id", "match_no");

-- CreateIndex
CREATE INDEX "match_participations_club_id_session_id_session_player_id_idx" ON "match_participations"("club_id", "session_id", "session_player_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_participations_match_id_session_player_id_segment_no_key" ON "match_participations"("match_id", "session_player_id", "segment_no");

-- CreateIndex
CREATE INDEX "match_court_usage_club_id_session_id_court_id_idx" ON "match_court_usage"("club_id", "session_id", "court_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_court_usage_match_id_court_id_key" ON "match_court_usage"("match_id", "court_id");

-- CreateIndex
CREATE INDEX "active_court_holds_match_id_idx" ON "active_court_holds"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "active_court_holds_club_id_session_id_court_id_key" ON "active_court_holds"("club_id", "session_id", "court_id");

-- CreateIndex
CREATE UNIQUE INDEX "active_player_holds_player_id_key" ON "active_player_holds"("player_id");

-- CreateIndex
CREATE INDEX "active_player_holds_match_id_idx" ON "active_player_holds"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "active_player_holds_club_id_session_id_session_player_id_key" ON "active_player_holds"("club_id", "session_id", "session_player_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_decisions_source_operation_id_key" ON "match_decisions"("source_operation_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_decisions_club_id_session_id_match_id_key" ON "match_decisions"("club_id", "session_id", "match_id");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "queue_sessions"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participations" ADD CONSTRAINT "match_participations_club_id_session_id_match_id_fkey" FOREIGN KEY ("club_id", "session_id", "match_id") REFERENCES "matches"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participations" ADD CONSTRAINT "match_participations_club_id_session_id_session_player_id_fkey" FOREIGN KEY ("club_id", "session_id", "session_player_id") REFERENCES "session_players"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_court_usage" ADD CONSTRAINT "match_court_usage_club_id_session_id_match_id_fkey" FOREIGN KEY ("club_id", "session_id", "match_id") REFERENCES "matches"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_court_usage" ADD CONSTRAINT "match_court_usage_club_id_session_id_court_id_fkey" FOREIGN KEY ("club_id", "session_id", "court_id") REFERENCES "session_courts"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_court_holds" ADD CONSTRAINT "active_court_holds_club_id_session_id_court_id_fkey" FOREIGN KEY ("club_id", "session_id", "court_id") REFERENCES "session_courts"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_court_holds" ADD CONSTRAINT "active_court_holds_club_id_session_id_match_id_fkey" FOREIGN KEY ("club_id", "session_id", "match_id") REFERENCES "matches"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_player_holds" ADD CONSTRAINT "active_player_holds_club_id_session_id_session_player_id_fkey" FOREIGN KEY ("club_id", "session_id", "session_player_id") REFERENCES "session_players"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_player_holds" ADD CONSTRAINT "active_player_holds_club_id_session_id_match_id_fkey" FOREIGN KEY ("club_id", "session_id", "match_id") REFERENCES "matches"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_player_holds" ADD CONSTRAINT "active_player_holds_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_decisions" ADD CONSTRAINT "match_decisions_club_id_session_id_match_id_fkey" FOREIGN KEY ("club_id", "session_id", "match_id") REFERENCES "matches"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_decisions" ADD CONSTRAINT "match_decisions_club_id_device_id_fkey" FOREIGN KEY ("club_id", "device_id") REFERENCES "devices"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- matches
ALTER TABLE "matches"
  ADD CONSTRAINT "matches_match_no_check" CHECK ("match_no" > 0),
  ADD CONSTRAINT "matches_removed_check" CHECK ("removed_at" IS NULL OR "state" = 'waiting'),
  ADD CONSTRAINT "matches_started_check" CHECK (("state" = 'waiting') = ("started_at" IS NULL)),
  ADD CONSTRAINT "matches_ended_check" CHECK (("state" IN ('completed', 'invalid')) = ("ended_at" IS NOT NULL)),
  ADD CONSTRAINT "matches_period_check" CHECK ("ended_at" IS NULL OR "ended_at" >= "started_at");

-- A match with a decision is frozen; its state must agree with the decision.
CREATE FUNCTION "matches_frozen_after_decision"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'matches are never deleted (match %)', OLD."id" USING ERRCODE = 'restrict_violation';
  END IF;
  IF OLD."state" IN ('completed', 'invalid') THEN
    RAISE EXCEPTION 'match % has a permanent decision', OLD."id" USING ERRCODE = 'restrict_violation';
  END IF;
  IF NEW."state" IN ('completed', 'invalid') AND NOT EXISTS (
    SELECT 1 FROM "match_decisions" d WHERE d."match_id" = NEW."id" AND d."kind"::text = NEW."state"::text
  ) THEN
    RAISE EXCEPTION 'match % needs a matching decision before it ends', NEW."id" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "matches_frozen_after_decision"
  BEFORE UPDATE OR DELETE ON "matches"
  FOR EACH ROW EXECUTE FUNCTION "matches_frozen_after_decision"();

-- match_participations: segments are evidence; frozen once the match is decided.
ALTER TABLE "match_participations"
  ADD CONSTRAINT "match_participations_segment_check" CHECK ("segment_no" > 0),
  ADD CONSTRAINT "match_participations_left_check" CHECK (("left_at" IS NULL) = ("left_operation_id" IS NULL)),
  ADD CONSTRAINT "match_participations_period_check" CHECK ("left_at" IS NULL OR "left_at" >= "joined_at"),
  ADD CONSTRAINT "match_participations_finished_check" CHECK (NOT "finished_with_match" OR "left_at" IS NULL);

CREATE FUNCTION "match_evidence_frozen"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target uuid := CASE WHEN TG_OP = 'INSERT' THEN NEW."match_id" ELSE OLD."match_id" END;
BEGIN
  IF EXISTS (SELECT 1 FROM "match_decisions" d WHERE d."match_id" = target) THEN
    RAISE EXCEPTION '% of decided match % is frozen', TG_TABLE_NAME, target USING ERRCODE = 'restrict_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    -- Waiting lineups may be edited; segments of a started match are never deleted.
    IF EXISTS (SELECT 1 FROM "matches" m WHERE m."id" = target AND m."state" <> 'waiting') THEN
      RAISE EXCEPTION '% of started match % cannot be deleted', TG_TABLE_NAME, target USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "match_participations_frozen"
  BEFORE INSERT OR UPDATE OR DELETE ON "match_participations"
  FOR EACH ROW EXECUTE FUNCTION "match_evidence_frozen"();

-- match_court_usage
ALTER TABLE "match_court_usage"
  ADD CONSTRAINT "match_court_usage_release_check" CHECK (("released_at" IS NULL) = ("release_operation_id" IS NULL)),
  ADD CONSTRAINT "match_court_usage_period_check" CHECK ("released_at" IS NULL OR "released_at" >= "acquired_at");
CREATE TRIGGER "match_court_usage_no_delete"
  BEFORE DELETE ON "match_court_usage"
  FOR EACH ROW EXECUTE FUNCTION "rotra_reject_mutation"();

-- Holds may only point at an active match (5v5 holds two courts for one match).
CREATE FUNCTION "active_holds_require_active_match"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "matches" m WHERE m."id" = NEW."match_id" AND m."state" = 'active') THEN
    RAISE EXCEPTION 'hold on % needs an active match', NEW."match_id" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "active_court_holds_active_match"
  BEFORE INSERT OR UPDATE ON "active_court_holds"
  FOR EACH ROW EXECUTE FUNCTION "active_holds_require_active_match"();
CREATE TRIGGER "active_player_holds_active_match"
  BEFORE INSERT OR UPDATE ON "active_player_holds"
  FOR EACH ROW EXECUTE FUNCTION "active_holds_require_active_match"();

-- match_decisions: append once. Completed needs a winner and an agreeing score pair (or none);
-- invalid has neither. Tied scores are impossible.
ALTER TABLE "match_decisions"
  ADD CONSTRAINT "match_decisions_kind_check" CHECK (
    ("kind" = 'completed' AND "winning_team" IS NOT NULL)
    OR ("kind" = 'invalid' AND "winning_team" IS NULL AND "team_a_score" IS NULL AND "team_b_score" IS NULL)
  ),
  ADD CONSTRAINT "match_decisions_score_pair_check" CHECK (("team_a_score" IS NULL) = ("team_b_score" IS NULL)),
  ADD CONSTRAINT "match_decisions_score_check" CHECK (
    "team_a_score" IS NULL
    OR ("team_a_score" >= 0 AND "team_b_score" >= 0 AND (
      ("winning_team" = 'A' AND "team_a_score" > "team_b_score")
      OR ("winning_team" = 'B' AND "team_b_score" > "team_a_score")
    ))
  ),
  ADD CONSTRAINT "match_decisions_actor_check" CHECK ("actor_club_id" = "club_id");
CREATE TRIGGER "match_decisions_append_only"
  BEFORE UPDATE OR DELETE ON "match_decisions"
  FOR EACH ROW EXECUTE FUNCTION "rotra_reject_mutation"();

REVOKE ALL ON "matches", "match_participations", "match_court_usage", "active_court_holds",
  "active_player_holds", "match_decisions" FROM anon, authenticated;
REVOKE ALL ON FUNCTION "matches_frozen_after_decision"(), "match_evidence_frozen"(),
  "active_holds_require_active_match"() FROM PUBLIC;
