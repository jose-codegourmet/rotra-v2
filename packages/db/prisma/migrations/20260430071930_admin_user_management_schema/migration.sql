-- CreateEnum
CREATE TYPE "admin_role_enum" AS ENUM ('super_admin', 'admin');

-- CreateEnum
CREATE TYPE "admin_notification_type_enum" AS ENUM ('new_club_application', 'new_demotion_request', 'new_complaint', 'new_moderation_flag');

-- AlterEnum
ALTER TYPE "admin_action_entity_enum" ADD VALUE 'admin_user';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "admin_action_enum" ADD VALUE 'admin_invited';
ALTER TYPE "admin_action_enum" ADD VALUE 'admin_invite_resent';
ALTER TYPE "admin_action_enum" ADD VALUE 'admin_activated';
ALTER TYPE "admin_action_enum" ADD VALUE 'admin_deactivated';
ALTER TYPE "admin_action_enum" ADD VALUE 'admin_reactivated';
ALTER TYPE "admin_action_enum" ADD VALUE 'admin_role_changed';
ALTER TYPE "admin_action_enum" ADD VALUE 'admin_force_signed_out';

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "admin_activated_at" TIMESTAMPTZ(6),
ADD COLUMN     "admin_deactivated_at" TIMESTAMPTZ(6),
ADD COLUMN     "admin_deactivated_by" UUID,
ADD COLUMN     "admin_invited_at" TIMESTAMPTZ(6),
ADD COLUMN     "admin_invited_by" UUID,
ADD COLUMN     "admin_is_active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "admin_role" "admin_role_enum";

-- CreateTable
CREATE TABLE "admin_invitations" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "admin_role_enum" NOT NULL,
    "invited_by" UUID NOT NULL,
    "status" "invitation_status_enum" NOT NULL DEFAULT 'pending',
    "accepted_by" UUID,
    "accepted_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() + '7 days'::interval),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_notifications" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "type" "admin_notification_type_enum" NOT NULL,
    "target_url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_admin_invitations_email" ON "admin_invitations"("email");

-- CreateIndex
CREATE INDEX "idx_admin_invitations_status" ON "admin_invitations"("status");

-- CreateIndex
CREATE INDEX "idx_admin_notif_admin_unread" ON "admin_notifications"("admin_id", "read_at");

-- CreateIndex
CREATE INDEX "idx_admin_notif_created" ON "admin_notifications"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_profiles_admin_role" ON "profiles"("admin_role");

-- AddForeignKey
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_admin_invited_by_fkey" FOREIGN KEY ("admin_invited_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_admin_deactivated_by_fkey" FOREIGN KEY ("admin_deactivated_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
