-- AlterEnum
ALTER TYPE "session_status_enum" ADD VALUE 'completed' BEFORE 'cancelled';

-- AlterTable
ALTER TABLE "queue_sessions" ADD COLUMN "venue_lat" DOUBLE PRECISION,
ADD COLUMN "venue_lng" DOUBLE PRECISION,
ADD COLUMN "venue_address" TEXT;

-- CreateIndex
CREATE INDEX "idx_queue_sessions_geo" ON "queue_sessions"("venue_lat", "venue_lng");
