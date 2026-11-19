-- I can't make it and the Session invite in real mode (D-2026-11-09-03 and D-2026-11-09-08; ticket
-- draft F07.64; owner sign-off for the batch, November 19, 2026). Additive: two enums, two tables and
-- one nullable column on session_join_requests. No existing row changes meaning.

-- CreateEnum
CREATE TYPE "drop_out_notice_status" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "drop_out_notice_decision" AS ENUM ('kept', 'removed');

-- CreateTable
CREATE TABLE "session_drop_out_notices" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "session_player_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "status" "drop_out_notice_status" NOT NULL DEFAULT 'open',
    "decision" "drop_out_notice_decision",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),
    "closed_by_device_id" UUID,

    CONSTRAINT "session_drop_out_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_invite_codes" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_invite_codes_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "session_join_requests" ADD COLUMN     "invite_code_id" UUID;

-- CreateIndex
CREATE INDEX "session_drop_out_notices_session_id_status_created_at_idx" ON "session_drop_out_notices"("session_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "session_drop_out_notices_club_id_session_id_session_player__idx" ON "session_drop_out_notices"("club_id", "session_id", "session_player_id");

-- CreateIndex
CREATE INDEX "session_drop_out_notices_player_id_idx" ON "session_drop_out_notices"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_invite_codes_code_key" ON "session_invite_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "session_invite_codes_session_id_player_id_key" ON "session_invite_codes"("session_id", "player_id");

-- CreateIndex
CREATE INDEX "session_join_requests_invite_code_id_idx" ON "session_join_requests"("invite_code_id");

-- AddForeignKey
ALTER TABLE "session_join_requests" ADD CONSTRAINT "session_join_requests_invite_code_id_fkey" FOREIGN KEY ("invite_code_id") REFERENCES "session_invite_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_drop_out_notices" ADD CONSTRAINT "session_drop_out_notices_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "queue_sessions"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_drop_out_notices" ADD CONSTRAINT "session_drop_out_notices_club_id_session_id_session_player_fkey" FOREIGN KEY ("club_id", "session_id", "session_player_id") REFERENCES "session_players"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_drop_out_notices" ADD CONSTRAINT "session_drop_out_notices_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_drop_out_notices" ADD CONSTRAINT "session_drop_out_notices_club_id_closed_by_device_id_fkey" FOREIGN KEY ("club_id", "closed_by_device_id") REFERENCES "devices"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_invite_codes" ADD CONSTRAINT "session_invite_codes_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "queue_sessions"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_invite_codes" ADD CONSTRAINT "session_invite_codes_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written: one open notice per roster entry.
CREATE UNIQUE INDEX "session_drop_out_notices_one_open_per_entry"
  ON "session_drop_out_notices" ("session_player_id") WHERE "status" = 'open';

-- Hand-written: decision coherence. An open notice has no closing time and no decision; a closed one
-- has a closing time, and only Keep or Remove from roster sets a decision (a notice closed by the
-- session ending has none).
ALTER TABLE "session_drop_out_notices"
  ADD CONSTRAINT "session_drop_out_notices_closed_check"
    CHECK (("status" = 'open') = ("closed_at" IS NULL)),
  ADD CONSTRAINT "session_drop_out_notices_decision_check"
    CHECK ("decision" IS NULL OR "status" = 'closed');

-- Hand-written: a Session invite code is short and never an RTR ID (lowercase letters and digits, as the shared rule makes it).
ALTER TABLE "session_invite_codes"
  ADD CONSTRAINT "session_invite_codes_code_format" CHECK ("code" ~ '^[a-z0-9]{6,16}$');

-- Server-only tables: the Route Handlers' runtime role writes them; no Supabase client role does.
ALTER TABLE "session_drop_out_notices" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "session_drop_out_notices" FROM anon, authenticated, PUBLIC;
ALTER TABLE "session_invite_codes" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "session_invite_codes" FROM anon, authenticated, PUBLIC;
