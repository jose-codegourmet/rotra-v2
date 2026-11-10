-- Q-PUBLIC-JOIN · Request to join as NAME from a signed-in ROTRA Player (D-2026-11-09-02; owner
-- migration sign-off, November 10, 2026, #687). Additive: a nullable column, one enum value and two
-- indexes. No existing row changes; guest requests keep player_id null.

-- AlterEnum: a Player's own Cancel request (distinct from declined and closed).
ALTER TYPE "join_request_status" ADD VALUE 'cancelled';

-- AlterTable
ALTER TABLE "session_join_requests" ADD COLUMN "player_id" UUID;

-- AddForeignKey
ALTER TABLE "session_join_requests" ADD CONSTRAINT "session_join_requests_player_id_fkey"
  FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "session_join_requests_player_id_idx" ON "session_join_requests"("player_id");

-- One open request per account and session.
CREATE UNIQUE INDEX "session_join_requests_session_id_player_id_pending_key"
  ON "session_join_requests" ("session_id", "player_id") WHERE "status" = 'pending';
