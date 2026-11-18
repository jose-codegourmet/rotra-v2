BEGIN;
-- CreateEnum
CREATE TYPE "player_notification_kind" AS ENUM ('announce', 'session', 'invite', 'club', 'rank', 'account');

-- AlterTable
ALTER TABLE "player_accounts" ADD COLUMN     "verification_reminder_read_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "player_notifications" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "kind" "player_notification_kind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "source_type" TEXT,
    "source_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ(6),

    CONSTRAINT "player_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_notifications_player_id_created_at_idx" ON "player_notifications"("player_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "player_notifications_source_key" ON "player_notifications"("player_id", "kind", "source_type", "source_id");

-- AddForeignKey
ALTER TABLE "player_notifications" ADD CONSTRAINT "player_notifications_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "player_notifications" ADD CONSTRAINT "player_notifications_source_pair_check"
  CHECK (("source_type" IS NULL) = ("source_id" IS NULL));

ALTER TABLE "player_notifications" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "player_notifications" FROM anon, authenticated, PUBLIC;

COMMIT;
