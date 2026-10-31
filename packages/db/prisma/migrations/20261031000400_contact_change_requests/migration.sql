-- F07.18 · contact-change approval and provider application state (#259)
-- DRAFT for review. Generated with `prisma migrate diff`, plus hand-written state CHECKs, partial
-- uniques and a terminal-state guard. Not applied; needs sign-off.
-- Open: request UI/verification requirements and provider enforcement (#244).

-- CreateEnum
CREATE TYPE "contact_change_field" AS ENUM ('phone', 'email');

-- CreateEnum
CREATE TYPE "contact_change_source" AS ENUM ('app', 'owner');

-- CreateEnum
CREATE TYPE "contact_change_status" AS ENUM ('pending', 'approved', 'applying', 'applied', 'rejected', 'failed');

-- CreateTable
CREATE TABLE "player_contact_change_requests" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "field" "contact_change_field" NOT NULL,
    "source" "contact_change_source" NOT NULL,
    "proposed_value" TEXT NOT NULL,
    "original_value" TEXT,
    "original_contact_revision" BIGINT NOT NULL,
    "status" "contact_change_status" NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMPTZ(6) NOT NULL,
    "submitted_by_admin_id" UUID,
    "source_command_id" UUID NOT NULL,
    "reviewed_by_admin_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "approved_at" TIMESTAMPTZ(6),
    "rejected_at" TIMESTAMPTZ(6),
    "provider_operation_ref" UUID,
    "application_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMPTZ(6),
    "provider_applied_at" TIMESTAMPTZ(6),
    "applied_at" TIMESTAMPTZ(6),
    "failure_code" TEXT,
    "resolution_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "player_contact_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "player_contact_change_requests_source_command_id_key" ON "player_contact_change_requests"("source_command_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_contact_change_requests_provider_operation_ref_key" ON "player_contact_change_requests"("provider_operation_ref");

-- CreateIndex
CREATE INDEX "player_contact_change_requests_player_id_requested_at_idx" ON "player_contact_change_requests"("player_id", "requested_at" DESC);

-- CreateIndex
CREATE INDEX "player_contact_change_requests_status_requested_at_idx" ON "player_contact_change_requests"("status", "requested_at");

-- CreateIndex
CREATE INDEX "player_contact_change_requests_field_proposed_value_idx" ON "player_contact_change_requests"("field", "proposed_value");

-- CreateIndex
CREATE INDEX "player_contact_change_requests_submitted_by_admin_id_idx" ON "player_contact_change_requests"("submitted_by_admin_id");

-- CreateIndex
CREATE INDEX "player_contact_change_requests_reviewed_by_admin_id_idx" ON "player_contact_change_requests"("reviewed_by_admin_id");

-- AddForeignKey
ALTER TABLE "player_contact_change_requests" ADD CONSTRAINT "player_contact_change_requests_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_contact_change_requests" ADD CONSTRAINT "player_contact_change_requests_submitted_by_admin_id_fkey" FOREIGN KEY ("submitted_by_admin_id") REFERENCES "admin_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_contact_change_requests" ADD CONSTRAINT "player_contact_change_requests_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "admin_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "player_contact_change_requests"
  ADD CONSTRAINT "player_contact_change_requests_proposed_value_check" CHECK (
    ("field" = 'phone' AND "proposed_value" ~ '^\+[1-9][0-9]{7,14}$')
    OR ("field" = 'email' AND "proposed_value" = lower(btrim("proposed_value")) AND "proposed_value" ~ '^[^@\s]+@[^@\s]+$')
  ),
  ADD CONSTRAINT "player_contact_change_requests_changes_value_check" CHECK (
    "original_value" IS DISTINCT FROM "proposed_value"
  ),
  ADD CONSTRAINT "player_contact_change_requests_source_check" CHECK (
    ("source" = 'owner') = ("submitted_by_admin_id" IS NOT NULL)
  ),
  ADD CONSTRAINT "player_contact_change_requests_attempts_check" CHECK ("application_attempts" >= 0),
  -- Approval evidence: every state past pending (except rejected) has a reviewer, approval time and
  -- a provider operation reference.
  ADD CONSTRAINT "player_contact_change_requests_approval_check" CHECK (
    "status" NOT IN ('approved', 'applying', 'applied', 'failed')
    OR ("reviewed_by_admin_id" IS NOT NULL AND "reviewed_at" IS NOT NULL
        AND "approved_at" IS NOT NULL AND "provider_operation_ref" IS NOT NULL)
  ),
  ADD CONSTRAINT "player_contact_change_requests_rejection_check" CHECK (
    ("status" = 'rejected') = ("rejected_at" IS NOT NULL)
    AND ("status" <> 'rejected' OR ("reviewed_by_admin_id" IS NOT NULL AND "approved_at" IS NULL))
  ),
  -- Only `applied` is a completed change, and it needs both stages.
  ADD CONSTRAINT "player_contact_change_requests_applied_check" CHECK (
    ("status" = 'applied') = ("applied_at" IS NOT NULL)
    AND ("status" <> 'applied' OR "provider_applied_at" IS NOT NULL)
  ),
  ADD CONSTRAINT "player_contact_change_requests_failed_check" CHECK (
    "status" <> 'failed' OR "failure_code" IS NOT NULL
  );

-- One open request per player from the Player app.
CREATE UNIQUE INDEX "player_contact_change_requests_one_open_app_request"
  ON "player_contact_change_requests" ("player_id")
  WHERE "source" = 'app' AND "status" IN ('pending', 'approved', 'applying', 'failed');

-- One accepted identity update in flight per player, whatever the source.
CREATE UNIQUE INDEX "player_contact_change_requests_one_in_flight_per_player"
  ON "player_contact_change_requests" ("player_id")
  WHERE "status" IN ('approved', 'applying', 'failed');

-- Uniqueness reservation: two accepted updates can never target the same login identifier.
CREATE UNIQUE INDEX "player_contact_change_requests_reserved_value"
  ON "player_contact_change_requests" ("field", "proposed_value")
  WHERE "status" IN ('approved', 'applying', 'failed');

-- Applied and rejected requests are final.
CREATE FUNCTION "player_contact_change_requests_final"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD."status" IN ('applied', 'rejected') THEN
    RAISE EXCEPTION 'contact change request % is final', OLD."id" USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "player_contact_change_requests_final"
  BEFORE UPDATE OR DELETE ON "player_contact_change_requests"
  FOR EACH ROW EXECUTE FUNCTION "player_contact_change_requests_final"();

REVOKE ALL ON "player_contact_change_requests" FROM anon, authenticated;
REVOKE ALL ON FUNCTION "player_contact_change_requests_final"() FROM PUBLIC;
