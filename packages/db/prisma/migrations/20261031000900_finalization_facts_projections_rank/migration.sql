-- F07.16 · finalization facts, projection jobs and current rank (#257)
-- DRAFT for review. Generated with `prisma migrate diff`, plus hand-written CHECKs, source partial
-- uniques, fact guards and immutability triggers. Not applied to any shared database; needs sign-off.
-- Open: rank formula, precision and award math (#247); attribution evidence (#244);
-- finalization barrier details (#246).

-- CreateEnum
CREATE TYPE "rank_state" AS ENUM ('provisional', 'established', 'needs_reassessment');

-- CreateEnum
CREATE TYPE "finalization_state" AS ENUM ('running', 'committed', 'done', 'failed');

-- CreateEnum
CREATE TYPE "finalization_stage" AS ENUM ('checking', 'finishing', 'player_records', 'slides');

-- CreateEnum
CREATE TYPE "projection_kind" AS ENUM ('club_session_summaries', 'result_snapshot', 'player_history', 'player_rank');

-- CreateEnum
CREATE TYPE "projection_source_type" AS ENUM ('finalization', 'assessment', 'attribution', 'ageing');

-- CreateEnum
CREATE TYPE "projection_job_status" AS ENUM ('pending', 'running', 'done', 'failed');

-- CreateTable
CREATE TABLE "player_rank_current" (
    "player_id" UUID NOT NULL,
    "skill_level_id" SMALLINT,
    "numeric_rank" DECIMAL(12,6),
    "state" "rank_state" NOT NULL,
    "explanation_code" TEXT,
    "assessment_component" DECIMAL(12,6),
    "performance_component" DECIMAL(12,6),
    "input_counts" JSONB NOT NULL,
    "evidence_digest" BYTEA,
    "policy_version_id" UUID NOT NULL,
    "algorithm_version" TEXT NOT NULL,
    "window_start" TIMESTAMPTZ(6) NOT NULL,
    "window_end" TIMESTAMPTZ(6) NOT NULL,
    "calculated_at" TIMESTAMPTZ(6) NOT NULL,
    "input_watermark" BIGINT NOT NULL,
    "next_recheck_at" TIMESTAMPTZ(6) NOT NULL,
    "recent_standard_match_count" INTEGER NOT NULL,
    "last_valid_played_at" TIMESTAMPTZ(6),
    "leaderboard_eligible" BOOLEAN NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "player_rank_current_pkey" PRIMARY KEY ("player_id")
);

-- CreateTable
CREATE TABLE "player_history_attributions" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "club_player_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "confirmed_at" TIMESTAMPTZ(6) NOT NULL,
    "confirmation_evidence" JSONB NOT NULL,
    "source_command_id" UUID NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "revoke_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_history_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_finalizations" (
    "session_id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "command_id" UUID NOT NULL,
    "state" "finalization_state" NOT NULL DEFAULT 'running',
    "stage" "finalization_stage" NOT NULL DEFAULT 'checking',
    "failed_stage" "finalization_stage",
    "failure_code" TEXT,
    "stream_manifest" JSONB NOT NULL,
    "manifest_digest" BYTEA NOT NULL,
    "accepted_session_revision" BIGINT NOT NULL,
    "policy_version_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "committed_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "facts_digest" BYTEA,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "session_finalizations_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "projection_jobs" (
    "id" UUID NOT NULL,
    "kind" "projection_kind" NOT NULL,
    "kind_version" INTEGER NOT NULL,
    "source_type" "projection_source_type" NOT NULL,
    "source_finalization_id" UUID,
    "source_assessment_id" UUID,
    "source_attribution_id" UUID,
    "target_player_id" UUID,
    "due_at" TIMESTAMPTZ(6),
    "status" "projection_job_status" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMPTZ(6),
    "last_error_code" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "projection_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_match_facts" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "session_player_id" UUID NOT NULL,
    "club_player_id" UUID NOT NULL,
    "player_id_at_finalization" UUID,
    "played_at" TIMESTAMPTZ(6) NOT NULL,
    "format" "match_format" NOT NULL,
    "team" "team_side" NOT NULL,
    "winning_team" "team_side" NOT NULL,
    "full_participation" BOOLEAN NOT NULL,
    "standard_match" BOOLEAN NOT NULL,
    "skill_level_snapshot_id" SMALLINT NOT NULL,
    "partner_entry_ids" UUID[],
    "opponent_entry_ids" UUID[],
    "team_a_score" INTEGER,
    "team_b_score" INTEGER,
    "fact_version" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_match_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_session_player_summaries" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "session_player_id" UUID NOT NULL,
    "club_player_id" UUID NOT NULL,
    "player_id_snapshot" UUID,
    "full_games" INTEGER NOT NULL,
    "standard_games" INTEGER NOT NULL,
    "fun_games" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "skill_level_snapshot_id" SMALLINT,
    "summary_version" INTEGER NOT NULL,
    "projected_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "club_session_player_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_result_snapshots" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "calculation_version" TEXT NOT NULL,
    "standings" JSONB NOT NULL,
    "awards" JSONB NOT NULL,
    "off_day" JSONB,
    "baseline_session_ids" UUID[],
    "generated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "session_result_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_rank_current_leaderboard_eligible_numeric_rank_playe_idx" ON "player_rank_current"("leaderboard_eligible", "numeric_rank" DESC, "player_id");

-- CreateIndex
CREATE INDEX "player_rank_current_next_recheck_at_idx" ON "player_rank_current"("next_recheck_at");

-- CreateIndex
CREATE UNIQUE INDEX "player_history_attributions_source_command_id_key" ON "player_history_attributions"("source_command_id");

-- CreateIndex
CREATE INDEX "player_history_attributions_player_id_idx" ON "player_history_attributions"("player_id");

-- CreateIndex
CREATE INDEX "player_history_attributions_club_id_club_player_id_idx" ON "player_history_attributions"("club_id", "club_player_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_finalizations_command_id_key" ON "session_finalizations"("command_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_finalizations_club_id_session_id_key" ON "session_finalizations"("club_id", "session_id");

-- CreateIndex
CREATE INDEX "projection_jobs_status_next_attempt_at_id_idx" ON "projection_jobs"("status", "next_attempt_at", "id");

-- CreateIndex
CREATE INDEX "projection_jobs_target_player_id_idx" ON "projection_jobs"("target_player_id");

-- CreateIndex
CREATE INDEX "player_match_facts_player_id_at_finalization_played_at_matc_idx" ON "player_match_facts"("player_id_at_finalization", "played_at" DESC, "match_id");

-- CreateIndex
CREATE INDEX "player_match_facts_club_id_club_player_id_played_at_idx" ON "player_match_facts"("club_id", "club_player_id", "played_at" DESC);

-- CreateIndex
CREATE INDEX "player_match_facts_club_id_session_id_idx" ON "player_match_facts"("club_id", "session_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_match_facts_match_id_session_player_id_key" ON "player_match_facts"("match_id", "session_player_id");

-- CreateIndex
CREATE INDEX "club_session_player_summaries_club_id_club_player_id_idx" ON "club_session_player_summaries"("club_id", "club_player_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_session_player_summaries_session_id_session_player_id_key" ON "club_session_player_summaries"("session_id", "session_player_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_session_player_summaries_club_id_session_id_session_pl_key" ON "club_session_player_summaries"("club_id", "session_id", "session_player_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_result_snapshots_session_id_version_key" ON "session_result_snapshots"("session_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "session_result_snapshots_club_id_session_id_id_key" ON "session_result_snapshots"("club_id", "session_id", "id");

-- AddForeignKey
ALTER TABLE "player_rank_current" ADD CONSTRAINT "player_rank_current_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_rank_current" ADD CONSTRAINT "player_rank_current_skill_level_id_fkey" FOREIGN KEY ("skill_level_id") REFERENCES "skill_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_rank_current" ADD CONSTRAINT "player_rank_current_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "ranking_policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_history_attributions" ADD CONSTRAINT "player_history_attributions_club_id_club_player_id_fkey" FOREIGN KEY ("club_id", "club_player_id") REFERENCES "club_players"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_history_attributions" ADD CONSTRAINT "player_history_attributions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_finalizations" ADD CONSTRAINT "session_finalizations_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "queue_sessions"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_finalizations" ADD CONSTRAINT "session_finalizations_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "ranking_policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projection_jobs" ADD CONSTRAINT "projection_jobs_source_finalization_id_fkey" FOREIGN KEY ("source_finalization_id") REFERENCES "session_finalizations"("session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projection_jobs" ADD CONSTRAINT "projection_jobs_source_assessment_id_fkey" FOREIGN KEY ("source_assessment_id") REFERENCES "club_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projection_jobs" ADD CONSTRAINT "projection_jobs_source_attribution_id_fkey" FOREIGN KEY ("source_attribution_id") REFERENCES "player_history_attributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projection_jobs" ADD CONSTRAINT "projection_jobs_target_player_id_fkey" FOREIGN KEY ("target_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_facts" ADD CONSTRAINT "player_match_facts_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "session_finalizations"("club_id", "session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_facts" ADD CONSTRAINT "player_match_facts_club_id_session_id_match_id_fkey" FOREIGN KEY ("club_id", "session_id", "match_id") REFERENCES "match_decisions"("club_id", "session_id", "match_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_facts" ADD CONSTRAINT "player_match_facts_club_id_session_id_session_player_id_fkey" FOREIGN KEY ("club_id", "session_id", "session_player_id") REFERENCES "session_players"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_facts" ADD CONSTRAINT "player_match_facts_club_id_club_player_id_fkey" FOREIGN KEY ("club_id", "club_player_id") REFERENCES "club_players"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_facts" ADD CONSTRAINT "player_match_facts_player_id_at_finalization_fkey" FOREIGN KEY ("player_id_at_finalization") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_facts" ADD CONSTRAINT "player_match_facts_skill_level_snapshot_id_fkey" FOREIGN KEY ("skill_level_snapshot_id") REFERENCES "skill_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_session_player_summaries" ADD CONSTRAINT "club_session_player_summaries_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "session_finalizations"("club_id", "session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_session_player_summaries" ADD CONSTRAINT "club_session_player_summaries_club_id_session_id_session_p_fkey" FOREIGN KEY ("club_id", "session_id", "session_player_id") REFERENCES "session_players"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_session_player_summaries" ADD CONSTRAINT "club_session_player_summaries_club_id_club_player_id_fkey" FOREIGN KEY ("club_id", "club_player_id") REFERENCES "club_players"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_session_player_summaries" ADD CONSTRAINT "club_session_player_summaries_skill_level_snapshot_id_fkey" FOREIGN KEY ("skill_level_snapshot_id") REFERENCES "skill_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_result_snapshots" ADD CONSTRAINT "session_result_snapshots_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "session_finalizations"("club_id", "session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- session_finalizations: only for a session that is not invalid; commit evidence freezes.
ALTER TABLE "session_finalizations"
  ADD CONSTRAINT "session_finalizations_digest_check" CHECK (
    octet_length("manifest_digest") = 32 AND ("facts_digest" IS NULL OR octet_length("facts_digest") = 32)
  ),
  ADD CONSTRAINT "session_finalizations_revision_check" CHECK ("accepted_session_revision" > 0),
  ADD CONSTRAINT "session_finalizations_committed_check" CHECK (
    ("committed_at" IS NULL) = ("facts_digest" IS NULL)
    AND ("state" NOT IN ('committed', 'done') OR "committed_at" IS NOT NULL)
  ),
  ADD CONSTRAINT "session_finalizations_done_check" CHECK (("state" = 'done') = ("completed_at" IS NOT NULL)),
  ADD CONSTRAINT "session_finalizations_failed_check" CHECK (("state" = 'failed') = ("failed_stage" IS NOT NULL));

CREATE FUNCTION "session_finalizations_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'finalizations are never deleted' USING ERRCODE = 'restrict_violation';
  END IF;
  IF TG_OP = 'INSERT' AND EXISTS (
    SELECT 1 FROM "queue_sessions" s WHERE s."id" = NEW."session_id" AND s."state" = 'invalid'
  ) THEN
    RAISE EXCEPTION 'an invalid session has no finalization' USING ERRCODE = 'check_violation';
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
CREATE TRIGGER "session_finalizations_guard"
  BEFORE INSERT OR UPDATE OR DELETE ON "session_finalizations"
  FOR EACH ROW EXECUTE FUNCTION "session_finalizations_guard"();

-- player_match_facts: only from completed decisions; append-only.
ALTER TABLE "player_match_facts"
  ADD CONSTRAINT "player_match_facts_version_check" CHECK ("fact_version" > 0),
  ADD CONSTRAINT "player_match_facts_score_check" CHECK (
    ("team_a_score" IS NULL) = ("team_b_score" IS NULL)
    AND ("team_a_score" IS NULL OR ("team_a_score" >= 0 AND "team_b_score" >= 0))
  ),
  ADD CONSTRAINT "player_match_facts_standard_check" CHECK (
    "standard_match" = ("format" IN ('singles', 'doubles'))
  );
CREATE FUNCTION "player_match_facts_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'player_match_facts is append-only' USING ERRCODE = 'restrict_violation';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "match_decisions" d
    WHERE d."match_id" = NEW."match_id" AND d."kind" = 'completed' AND d."winning_team" = NEW."winning_team"
  ) THEN
    RAISE EXCEPTION 'facts come only from a completed decision with the same winner' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "player_match_facts_guard"
  BEFORE INSERT OR UPDATE OR DELETE ON "player_match_facts"
  FOR EACH ROW EXECUTE FUNCTION "player_match_facts_guard"();

-- club_session_player_summaries: replaceable projection with sane totals.
ALTER TABLE "club_session_player_summaries"
  ADD CONSTRAINT "club_session_player_summaries_counts_check" CHECK (
    "full_games" >= 0 AND "standard_games" >= 0 AND "fun_games" >= 0 AND "wins" >= 0 AND "losses" >= 0
    AND "wins" + "losses" = "full_games" AND "standard_games" + "fun_games" = "full_games"
  ),
  ADD CONSTRAINT "club_session_player_summaries_version_check" CHECK ("summary_version" > 0);

-- session_result_snapshots: immutable, versioned.
ALTER TABLE "session_result_snapshots"
  ADD CONSTRAINT "session_result_snapshots_version_check" CHECK ("version" > 0);
CREATE TRIGGER "session_result_snapshots_append_only"
  BEFORE UPDATE OR DELETE ON "session_result_snapshots"
  FOR EACH ROW EXECUTE FUNCTION "rotra_reject_mutation"();

-- projection_jobs: exactly one explicit source per job, unique per source + kind + version.
ALTER TABLE "projection_jobs"
  ADD CONSTRAINT "projection_jobs_source_check" CHECK (
    ("source_type" = 'finalization') = ("source_finalization_id" IS NOT NULL)
    AND ("source_type" = 'assessment') = ("source_assessment_id" IS NOT NULL)
    AND ("source_type" = 'attribution') = ("source_attribution_id" IS NOT NULL)
    AND ("source_type" <> 'ageing' OR ("target_player_id" IS NOT NULL AND "due_at" IS NOT NULL))
  ),
  ADD CONSTRAINT "projection_jobs_version_check" CHECK ("kind_version" > 0),
  ADD CONSTRAINT "projection_jobs_attempts_check" CHECK ("attempts" >= 0),
  ADD CONSTRAINT "projection_jobs_done_check" CHECK (("status" = 'done') = ("completed_at" IS NOT NULL));
CREATE UNIQUE INDEX "projection_jobs_finalization_source_key"
  ON "projection_jobs" ("source_finalization_id", "kind", "kind_version", "target_player_id") NULLS NOT DISTINCT
  WHERE "source_type" = 'finalization';
CREATE UNIQUE INDEX "projection_jobs_assessment_source_key"
  ON "projection_jobs" ("source_assessment_id", "kind", "kind_version")
  WHERE "source_type" = 'assessment';
CREATE UNIQUE INDEX "projection_jobs_attribution_source_key"
  ON "projection_jobs" ("source_attribution_id", "kind", "kind_version", "target_player_id") NULLS NOT DISTINCT
  WHERE "source_type" = 'attribution';
CREATE UNIQUE INDEX "projection_jobs_ageing_source_key"
  ON "projection_jobs" ("target_player_id", "kind", "kind_version", "due_at")
  WHERE "source_type" = 'ageing';

-- player_rank_current: windows and counts are sane; null components mean missing evidence.
ALTER TABLE "player_rank_current"
  ADD CONSTRAINT "player_rank_current_window_check" CHECK ("window_end" > "window_start"),
  ADD CONSTRAINT "player_rank_current_count_check" CHECK ("recent_standard_match_count" >= 0),
  ADD CONSTRAINT "player_rank_current_watermark_check" CHECK ("input_watermark" >= 0),
  ADD CONSTRAINT "player_rank_current_eligible_check" CHECK (NOT "leaderboard_eligible" OR "numeric_rank" IS NOT NULL);

-- player_history_attributions: one live link per club player; links are revoked, never deleted.
ALTER TABLE "player_history_attributions"
  ADD CONSTRAINT "player_history_attributions_revoke_check" CHECK (("revoked_at" IS NULL) = ("revoke_reason" IS NULL));
CREATE UNIQUE INDEX "player_history_attributions_one_live_per_club_player"
  ON "player_history_attributions" ("club_id", "club_player_id") WHERE "revoked_at" IS NULL;
CREATE TRIGGER "player_history_attributions_no_delete"
  BEFORE DELETE ON "player_history_attributions"
  FOR EACH ROW EXECUTE FUNCTION "rotra_reject_mutation"();

REVOKE ALL ON "session_finalizations", "player_match_facts", "club_session_player_summaries",
  "session_result_snapshots", "projection_jobs", "player_rank_current", "player_history_attributions"
  FROM anon, authenticated;
REVOKE ALL ON FUNCTION "session_finalizations_guard"(), "player_match_facts_guard"() FROM PUBLIC;
