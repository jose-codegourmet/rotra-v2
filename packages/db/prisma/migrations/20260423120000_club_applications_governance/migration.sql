-- Enum extensions and new governance enums
CREATE TYPE "expected_player_bucket_enum" AS ENUM (
  'one_to_ten',
  'eleven_to_twentyfive',
  'twentysix_to_fifty',
  'fiftyone_to_hundred',
  'hundred_plus'
);

CREATE TYPE "application_rejection_reason_enum" AS ENUM (
  'insufficient_information',
  'unverifiable_venue',
  'unverifiable_contact',
  'duplicate_or_squatting',
  'policy_violation',
  'spam_or_low_quality',
  'applicant_history',
  'other'
);

CREATE TYPE "admin_action_enum" AS ENUM (
  'application_approved',
  'application_rejected',
  'demotion_approved_archived',
  'demotion_approved_transferred',
  'demotion_rejected',
  'complaint_dismissed',
  'complaint_escalated',
  'complaint_resolved',
  'moderation_flag_resolved',
  'moderation_flag_dismissed',
  'kill_switch_toggled',
  'platform_config_updated',
  'club_manual_archived',
  'club_manual_demoted'
);

CREATE TYPE "admin_action_entity_enum" AS ENUM (
  'club_application',
  'club_demotion_request',
  'complaint',
  'moderation_flag',
  'kill_switch',
  'platform_config',
  'club',
  'profile'
);

ALTER TYPE "application_status_enum" ADD VALUE IF NOT EXISTS 'in_review';
ALTER TYPE "application_status_enum" ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TYPE "membership_action_enum" ADD VALUE IF NOT EXISTS 'ownership_revoked';

ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'club_application_submitted';
ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'club_application_approved';
ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'club_application_rejected';

-- Legacy table superseded by club_applications (see docs/database/12_club_governance.md)
DROP TABLE IF EXISTS "club_owner_applications";

CREATE TABLE "admin_action_log" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "action" "admin_action_enum" NOT NULL,
    "entity_type" "admin_action_entity_enum" NOT NULL,
    "entity_id" UUID NOT NULL,
    "before_value" JSONB,
    "after_value" JSONB,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_action_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_admin_log_admin" ON "admin_action_log"("admin_id");
CREATE INDEX "idx_admin_log_entity" ON "admin_action_log"("entity_type", "entity_id");
CREATE INDEX "idx_admin_log_created" ON "admin_action_log"("created_at" DESC);

ALTER TABLE "admin_action_log" ADD CONSTRAINT "admin_action_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "clubs" ADD COLUMN "location_city" TEXT;
ALTER TABLE "clubs" ADD COLUMN "location_venue" TEXT;

CREATE TABLE "club_applications" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "club_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "location_city" TEXT NOT NULL,
    "location_venue" TEXT NOT NULL,
    "venue_address" TEXT NOT NULL,
    "facebook_page_url" TEXT,
    "facebook_profile_url" TEXT,
    "contact_number" TEXT,
    "expected_player_count" "expected_player_bucket_enum" NOT NULL,
    "additional_notes" TEXT,
    "status" "application_status_enum" NOT NULL DEFAULT 'pending',
    "rejection_reason" "application_rejection_reason_enum",
    "review_note" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "resulting_club_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "club_applications_resulting_club_id_key" ON "club_applications"("resulting_club_id");

CREATE INDEX "idx_club_applications_player_id" ON "club_applications"("player_id");
CREATE INDEX "idx_club_applications_status" ON "club_applications"("status");
CREATE INDEX "idx_club_applications_created" ON "club_applications"("created_at" DESC);
CREATE INDEX "idx_club_applications_updated_pending" ON "club_applications"("updated_at" DESC) WHERE "status" = 'pending';

ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_resulting_club_id_fkey" FOREIGN KEY ("resulting_club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Auto-insert owner into club_members when a club row is created (docs/database/02_clubs.md)
CREATE OR REPLACE FUNCTION handle_new_club()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "club_members" ("id", "club_id", "player_id", "role", "status", "joined_at", "updated_at")
  VALUES (gen_random_uuid(), NEW."id", NEW."owner_id", 'owner', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_club_created ON "clubs";
CREATE TRIGGER on_club_created
  AFTER INSERT ON "clubs"
  FOR EACH ROW
  EXECUTE PROCEDURE handle_new_club();
