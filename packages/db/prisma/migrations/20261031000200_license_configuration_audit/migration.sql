-- F07.10 · license terms, entitlements, configuration and audit records (#251)
-- DRAFT for review. Generated with `prisma migrate diff`, plus hand-written CHECKs, partial
-- uniques, append-only triggers and the initial ranking policy. Not applied; needs sign-off.
-- Open: renewal/overlap/refund policy (#245); policy retroactivity (#247); retention (#248).

-- CreateEnum
CREATE TYPE "club_name_change_state" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "license_plan" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "club_expiry_cycle_state" AS ENUM ('running', 'cancelled', 'completed');

-- CreateTable
CREATE TABLE "admin_audit_events" (
    "id" UUID NOT NULL,
    "actor_admin_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "source_command_id" UUID,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "admin_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_name_change_requests" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "requested_name" TEXT NOT NULL,
    "requested_name_key" TEXT NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL,
    "state" "club_name_change_state" NOT NULL DEFAULT 'pending',
    "reviewed_by_admin_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "source_command_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "club_name_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "key" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "value" BOOLEAN NOT NULL DEFAULT false,
    "created_by_admin_id" UUID NOT NULL,
    "updated_by_admin_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ranking_policy_versions" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "effective_at" TIMESTAMPTZ(6) NOT NULL,
    "assessment_weight_bp" SMALLINT NOT NULL,
    "performance_weight_bp" SMALLINT NOT NULL,
    "recent_standard_match_threshold" SMALLINT NOT NULL,
    "algorithm_version" TEXT NOT NULL,
    "created_by_admin_id" UUID,
    "change_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranking_policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_license_terms" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "plan" "license_plan" NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "activated_by_admin_id" UUID NOT NULL,
    "activated_at" TIMESTAMPTZ(6) NOT NULL,
    "source_command_id" UUID NOT NULL,
    "pricing_at_activation" "license_pricing" NOT NULL,
    "paid_on" DATE,
    "amount_minor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PHP',
    "payment_reference" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_license_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_entitlements" (
    "club_id" UUID NOT NULL,
    "effective_term_id" UUID,
    "effective_access_ends_at" TIMESTAMPTZ(6),
    "current_expiry_cycle_id" UUID,
    "refreshed_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "club_entitlements_pkey" PRIMARY KEY ("club_id")
);

-- CreateTable
CREATE TABLE "club_expiry_cycles" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "expired_at" TIMESTAMPTZ(6) NOT NULL,
    "delete_public_pages_after" TIMESTAMPTZ(6) NOT NULL,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_term_id" UUID,
    "state" "club_expiry_cycle_state" NOT NULL DEFAULT 'running',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "club_expiry_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_audit_events_source_command_id_key" ON "admin_audit_events"("source_command_id");

-- CreateIndex
CREATE INDEX "admin_audit_events_actor_admin_id_occurred_at_idx" ON "admin_audit_events"("actor_admin_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "admin_audit_events_target_type_target_id_occurred_at_idx" ON "admin_audit_events"("target_type", "target_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "club_name_change_requests_source_command_id_key" ON "club_name_change_requests"("source_command_id");

-- CreateIndex
CREATE INDEX "club_name_change_requests_club_id_requested_at_idx" ON "club_name_change_requests"("club_id", "requested_at" DESC);

-- CreateIndex
CREATE INDEX "club_name_change_requests_state_requested_at_idx" ON "club_name_change_requests"("state", "requested_at");

-- CreateIndex
CREATE INDEX "club_name_change_requests_reviewed_by_admin_id_idx" ON "club_name_change_requests"("reviewed_by_admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_name_key" ON "feature_flags"("name");

-- CreateIndex
CREATE INDEX "feature_flags_created_by_admin_id_idx" ON "feature_flags"("created_by_admin_id");

-- CreateIndex
CREATE INDEX "feature_flags_updated_by_admin_id_idx" ON "feature_flags"("updated_by_admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "ranking_policy_versions_version_key" ON "ranking_policy_versions"("version");

-- CreateIndex
CREATE INDEX "ranking_policy_versions_effective_at_idx" ON "ranking_policy_versions"("effective_at" DESC);

-- CreateIndex
CREATE INDEX "ranking_policy_versions_created_by_admin_id_idx" ON "ranking_policy_versions"("created_by_admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_license_terms_source_command_id_key" ON "club_license_terms"("source_command_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_license_terms_payment_reference_key" ON "club_license_terms"("payment_reference");

-- CreateIndex
CREATE INDEX "club_license_terms_club_id_starts_at_idx" ON "club_license_terms"("club_id", "starts_at" DESC);

-- CreateIndex
CREATE INDEX "club_license_terms_activated_by_admin_id_idx" ON "club_license_terms"("activated_by_admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_license_terms_club_id_id_key" ON "club_license_terms"("club_id", "id");

-- CreateIndex
CREATE INDEX "club_expiry_cycles_state_delete_public_pages_after_id_idx" ON "club_expiry_cycles"("state", "delete_public_pages_after", "id");

-- CreateIndex
CREATE INDEX "club_expiry_cycles_club_id_expired_at_idx" ON "club_expiry_cycles"("club_id", "expired_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "club_expiry_cycles_club_id_id_key" ON "club_expiry_cycles"("club_id", "id");

-- AddForeignKey
ALTER TABLE "admin_audit_events" ADD CONSTRAINT "admin_audit_events_actor_admin_id_fkey" FOREIGN KEY ("actor_admin_id") REFERENCES "admin_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_name_change_requests" ADD CONSTRAINT "club_name_change_requests_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_name_change_requests" ADD CONSTRAINT "club_name_change_requests_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "admin_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admin_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_updated_by_admin_id_fkey" FOREIGN KEY ("updated_by_admin_id") REFERENCES "admin_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranking_policy_versions" ADD CONSTRAINT "ranking_policy_versions_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admin_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_license_terms" ADD CONSTRAINT "club_license_terms_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_license_terms" ADD CONSTRAINT "club_license_terms_activated_by_admin_id_fkey" FOREIGN KEY ("activated_by_admin_id") REFERENCES "admin_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_entitlements" ADD CONSTRAINT "club_entitlements_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_entitlements" ADD CONSTRAINT "club_entitlements_club_id_effective_term_id_fkey" FOREIGN KEY ("club_id", "effective_term_id") REFERENCES "club_license_terms"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_entitlements" ADD CONSTRAINT "club_entitlements_club_id_current_expiry_cycle_id_fkey" FOREIGN KEY ("club_id", "current_expiry_cycle_id") REFERENCES "club_expiry_cycles"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_expiry_cycles" ADD CONSTRAINT "club_expiry_cycles_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_expiry_cycles" ADD CONSTRAINT "club_expiry_cycles_club_id_cancellation_term_id_fkey" FOREIGN KEY ("club_id", "cancellation_term_id") REFERENCES "club_license_terms"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Shared guard for append-only evidence tables.
CREATE FUNCTION "rotra_reject_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'restrict_violation';
END;
$$;

-- club_license_terms: historical amounts are never rewritten.
ALTER TABLE "club_license_terms"
  ADD CONSTRAINT "club_license_terms_period_check" CHECK ("starts_at" < "ends_at"),
  ADD CONSTRAINT "club_license_terms_amount_check" CHECK ("amount_minor" >= 0),
  ADD CONSTRAINT "club_license_terms_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  -- A free term records zero intentionally and has no external payment date.
  ADD CONSTRAINT "club_license_terms_free_check" CHECK (
    "pricing_at_activation" <> 'free' OR ("amount_minor" = 0 AND "paid_on" IS NULL)
  ),
  ADD CONSTRAINT "club_license_terms_paid_check" CHECK (
    "pricing_at_activation" <> 'paid' OR ("amount_minor" > 0 AND "paid_on" IS NOT NULL)
  );
CREATE TRIGGER "club_license_terms_append_only"
  BEFORE UPDATE OR DELETE ON "club_license_terms"
  FOR EACH ROW EXECUTE FUNCTION "rotra_reject_mutation"();

-- club_entitlements: access end and term go together.
ALTER TABLE "club_entitlements"
  ADD CONSTRAINT "club_entitlements_term_check" CHECK (
    ("effective_term_id" IS NULL) = ("effective_access_ends_at" IS NULL)
  ),
  ADD CONSTRAINT "club_entitlements_revision_check" CHECK ("revision" > 0);

-- club_expiry_cycles: one running cycle per club; cancellation evidence matches the state.
ALTER TABLE "club_expiry_cycles"
  ADD CONSTRAINT "club_expiry_cycles_deadline_check" CHECK ("delete_public_pages_after" > "expired_at"),
  ADD CONSTRAINT "club_expiry_cycles_cancelled_check" CHECK (
    ("state" = 'cancelled') = ("cancelled_at" IS NOT NULL)
    AND ("cancellation_term_id" IS NULL OR "state" = 'cancelled')
  );
CREATE UNIQUE INDEX "club_expiry_cycles_one_running_per_club"
  ON "club_expiry_cycles" ("club_id") WHERE "state" = 'running';

-- club_name_change_requests: one pending request per club; reviews carry a reviewer.
ALTER TABLE "club_name_change_requests"
  ADD CONSTRAINT "club_name_change_requests_name_check" CHECK (
    length(btrim("requested_name")) > 0 AND length("requested_name_key") > 0
  ),
  ADD CONSTRAINT "club_name_change_requests_review_check" CHECK (
    "state" NOT IN ('approved', 'rejected')
    OR ("reviewed_by_admin_id" IS NOT NULL AND "reviewed_at" IS NOT NULL)
  );
CREATE UNIQUE INDEX "club_name_change_requests_one_pending_per_club"
  ON "club_name_change_requests" ("club_id") WHERE "state" = 'pending';

-- admin_audit_events: append-only.
CREATE TRIGGER "admin_audit_events_append_only"
  BEFORE UPDATE OR DELETE ON "admin_audit_events"
  FOR EACH ROW EXECUTE FUNCTION "rotra_reject_mutation"();

-- feature_flags: key format and immutability; the catalog starts empty.
ALTER TABLE "feature_flags"
  ADD CONSTRAINT "feature_flags_key_check" CHECK ("key" ~ '^[a-z][a-z0-9_]{2,39}$'),
  ADD CONSTRAINT "feature_flags_name_check" CHECK (length(btrim("name")) > 0);
CREATE FUNCTION "feature_flags_key_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."key" <> OLD."key" THEN
    RAISE EXCEPTION 'feature_flags.key is immutable' USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "feature_flags_key_immutable"
  BEFORE UPDATE OF "key" ON "feature_flags"
  FOR EACH ROW EXECUTE FUNCTION "feature_flags_key_immutable"();

-- ranking_policy_versions: append-only configuration, never a recalculation record.
ALTER TABLE "ranking_policy_versions"
  ADD CONSTRAINT "ranking_policy_versions_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "ranking_policy_versions_weights_check" CHECK (
    "assessment_weight_bp" BETWEEN 0 AND 10000
    AND "performance_weight_bp" BETWEEN 0 AND 10000
    AND "assessment_weight_bp" + "performance_weight_bp" = 10000
  ),
  ADD CONSTRAINT "ranking_policy_versions_threshold_check" CHECK ("recent_standard_match_threshold" BETWEEN 1 AND 40);
CREATE TRIGGER "ranking_policy_versions_append_only"
  BEFORE UPDATE OR DELETE ON "ranking_policy_versions"
  FOR EACH ROW EXECUTE FUNCTION "rotra_reject_mutation"();

-- Initial values 7000 / 3000 / 10. The algorithm reference stays a placeholder until #247.
INSERT INTO "ranking_policy_versions"
  ("id", "version", "effective_at", "assessment_weight_bp", "performance_weight_bp",
   "recent_standard_match_threshold", "algorithm_version", "change_note")
VALUES
  (gen_random_uuid(), 1, CURRENT_TIMESTAMP, 7000, 3000, 10, 'unapproved', 'Initial settings');

REVOKE ALL ON "club_license_terms", "club_entitlements", "club_expiry_cycles",
  "club_name_change_requests", "admin_audit_events", "feature_flags", "ranking_policy_versions"
  FROM anon, authenticated;
REVOKE ALL ON FUNCTION "rotra_reject_mutation"(), "feature_flags_key_immutable"() FROM PUBLIC;
