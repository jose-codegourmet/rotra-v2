-- CreateEnum
CREATE TYPE "notification_severity_enum" AS ENUM ('urgent', 'warning', 'info');

-- AlterEnum
ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'platform_announcement';

-- AlterEnum
ALTER TYPE "admin_notification_type_enum" ADD VALUE IF NOT EXISTS 'platform_announcement';

-- AlterEnum
ALTER TYPE "admin_notification_type_enum" ADD VALUE IF NOT EXISTS 'admin_profile_changed';

-- CreateTable
CREATE TABLE "notification_broadcasts" (
    "id" UUID NOT NULL,
    "notification_type" "notification_type_enum" NOT NULL,
    "admin_notification_type" "admin_notification_type_enum" NOT NULL,
    "severity" "notification_severity_enum" NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "app_scopes" TEXT[] NOT NULL DEFAULT '{}',
    "tag_slugs" TEXT[] NOT NULL DEFAULT '{}',
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "related_entity_type" TEXT,
    "related_entity_id" UUID,
    "target_url" TEXT,
    "scheduled_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_broadcasts_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "severity" "notification_severity_enum" NOT NULL DEFAULT 'info';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "broadcast_id" UUID;

-- AlterTable
ALTER TABLE "admin_notifications" ADD COLUMN "severity" "notification_severity_enum" NOT NULL DEFAULT 'info';

-- AlterTable
ALTER TABLE "admin_notifications" ADD COLUMN "broadcast_id" UUID;

-- CreateIndex
CREATE INDEX "idx_notification_broadcasts_created" ON "notification_broadcasts"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_notification_broadcasts_created_by" ON "notification_broadcasts"("created_by");

-- CreateIndex
CREATE INDEX "idx_notifications_broadcast_id" ON "notifications"("broadcast_id");

-- CreateIndex
CREATE INDEX "idx_admin_notif_broadcast" ON "admin_notifications"("broadcast_id");

-- AddForeignKey
ALTER TABLE "notification_broadcasts" ADD CONSTRAINT "notification_broadcasts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "notification_broadcasts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "notification_broadcasts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
