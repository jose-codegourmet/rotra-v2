-- Match requests in real mode (D-2026-11-09-05; owner sign-off for the real-mode migration, November
-- 12, 2026). A present, signed-in Player asks the Queue Master for a match from the session page; the
-- Queue Master adds it to the Main Queue or declines it. Additive: one session column (backfilled),
-- two enums and two tables. No existing row changes meaning.

-- CreateEnum
CREATE TYPE "match_request_status" AS ENUM ('open', 'added', 'declined', 'cancelled', 'closed');

-- CreateEnum
CREATE TYPE "match_request_side" AS ENUM ('partner', 'opponent');

-- AlterTable
ALTER TABLE "queue_sessions" ADD COLUMN     "request_formats" "match_format"[] DEFAULT ARRAY['doubles']::"match_format"[];

-- CreateTable
CREATE TABLE "session_match_requests" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "session_player_id" UUID NOT NULL,
    "format" "match_format" NOT NULL,
    "status" "match_request_status" NOT NULL DEFAULT 'open',
    "requested_at" TIMESTAMPTZ(6) NOT NULL,
    "decided_at" TIMESTAMPTZ(6),
    "match_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "session_match_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_match_request_spots" (
    "request_id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "side" "match_request_side" NOT NULL,
    "slot_no" SMALLINT NOT NULL,
    "session_player_id" UUID,

    CONSTRAINT "session_match_request_spots_pkey" PRIMARY KEY ("request_id","side","slot_no")
);

-- CreateIndex
CREATE INDEX "session_match_requests_session_id_status_requested_at_idx" ON "session_match_requests"("session_id", "status", "requested_at");

-- CreateIndex
CREATE INDEX "session_match_requests_club_id_session_id_session_player_id_idx" ON "session_match_requests"("club_id", "session_id", "session_player_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_match_requests_club_id_session_id_id_key" ON "session_match_requests"("club_id", "session_id", "id");

-- CreateIndex
CREATE INDEX "session_match_request_spots_club_id_session_id_session_play_idx" ON "session_match_request_spots"("club_id", "session_id", "session_player_id");

-- AddForeignKey
ALTER TABLE "session_match_requests" ADD CONSTRAINT "session_match_requests_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "queue_sessions"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_match_requests" ADD CONSTRAINT "session_match_requests_club_id_session_id_session_player_i_fkey" FOREIGN KEY ("club_id", "session_id", "session_player_id") REFERENCES "session_players"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_match_requests" ADD CONSTRAINT "session_match_requests_club_id_session_id_match_id_fkey" FOREIGN KEY ("club_id", "session_id", "match_id") REFERENCES "matches"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_match_request_spots" ADD CONSTRAINT "session_match_request_spots_club_id_session_id_request_id_fkey" FOREIGN KEY ("club_id", "session_id", "request_id") REFERENCES "session_match_requests"("club_id", "session_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_match_request_spots" ADD CONSTRAINT "session_match_request_spots_club_id_session_id_session_pla_fkey" FOREIGN KEY ("club_id", "session_id", "session_player_id") REFERENCES "session_players"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written: every existing session gets the prototype default for Players can request (2 v 2,
-- plus 1 v 1 when singles is on), the same default new sessions get from the create command.
UPDATE "queue_sessions"
  SET "request_formats" = CASE WHEN "allow_singles"
    THEN ARRAY['doubles', 'singles']::"match_format"[]
    ELSE ARRAY['doubles']::"match_format"[] END;

-- Hand-written: decision coherence. An open request has no decision time; only an added request
-- names the waiting match it made.
ALTER TABLE "session_match_requests"
  ADD CONSTRAINT "session_match_requests_decided_check"
    CHECK (("status" = 'open') = ("decided_at" IS NULL)),
  ADD CONSTRAINT "session_match_requests_match_check"
    CHECK (("status" = 'added') = ("match_id" IS NOT NULL));

-- One open request per player and session.
CREATE UNIQUE INDEX "session_match_requests_one_open_per_player"
  ON "session_match_requests" ("session_id", "session_player_id") WHERE "status" = 'open';

-- A spot's position is 0-based; each player is named at most once per request.
ALTER TABLE "session_match_request_spots"
  ADD CONSTRAINT "session_match_request_spots_slot_check" CHECK ("slot_no" >= 0);
CREATE UNIQUE INDEX "session_match_request_spots_one_per_player"
  ON "session_match_request_spots" ("request_id", "session_player_id")
  WHERE "session_player_id" IS NOT NULL;

-- Server-only tables: the Route Handlers' runtime role writes them; no Supabase client role does.
ALTER TABLE "session_match_requests" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "session_match_requests" FROM anon, authenticated, PUBLIC;
ALTER TABLE "session_match_request_spots" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "session_match_request_spots" FROM anon, authenticated, PUBLIC;
