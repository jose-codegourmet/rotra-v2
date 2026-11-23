-- Slot transfer: request, approve, reject and pre-session cutoff (#1011, epic #1009; owner decisions
-- #1015, November 22, 2026; D-2026-11-22-03). Applied to a local disposable database 2026-11-22 only;
-- not applied to the shared database: owner sign-off needed.
-- Additive: one enum, one value on roster_release_reason and one table. No existing row changes meaning.
-- CreateEnum
CREATE TYPE "slot_transfer_status" AS ENUM ('pending', 'approved', 'rejected', 'withdrawn', 'expired', 'cancelled');

-- AlterEnum
ALTER TYPE "roster_release_reason" ADD VALUE 'transferred';

-- CreateTable
CREATE TABLE "session_slot_transfers" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "sender_session_player_id" UUID NOT NULL,
    "sender_club_player_id" UUID NOT NULL,
    "sender_player_id" UUID NOT NULL,
    "recipient_player_id" UUID,
    "recipient_club_player_id" UUID,
    "recipient_session_player_id" UUID,
    "recipient_was_waitlisted" BOOLEAN,
    "status" "slot_transfer_status" NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMPTZ(6) NOT NULL,
    "decided_at" TIMESTAMPTZ(6),
    "decided_by_device_id" UUID,
    "withdrawn_by_player_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_slot_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_slot_transfers_session_id_status_requested_at_idx" ON "session_slot_transfers"("session_id", "status", "requested_at");

-- CreateIndex
CREATE INDEX "session_slot_transfers_club_id_session_id_sender_session_pl_idx" ON "session_slot_transfers"("club_id", "session_id", "sender_session_player_id");

-- CreateIndex
CREATE INDEX "session_slot_transfers_club_id_session_id_recipient_session_idx" ON "session_slot_transfers"("club_id", "session_id", "recipient_session_player_id");

-- CreateIndex
CREATE INDEX "session_slot_transfers_sender_player_id_idx" ON "session_slot_transfers"("sender_player_id");

-- CreateIndex
CREATE INDEX "session_slot_transfers_recipient_player_id_idx" ON "session_slot_transfers"("recipient_player_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_slot_transfers_club_id_session_id_id_key" ON "session_slot_transfers"("club_id", "session_id", "id");

-- AddForeignKey
ALTER TABLE "session_slot_transfers" ADD CONSTRAINT "session_slot_transfers_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "queue_sessions"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_slot_transfers" ADD CONSTRAINT "session_slot_transfers_club_id_session_id_sender_session_p_fkey" FOREIGN KEY ("club_id", "session_id", "sender_session_player_id") REFERENCES "session_players"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_slot_transfers" ADD CONSTRAINT "session_slot_transfers_club_id_sender_club_player_id_fkey" FOREIGN KEY ("club_id", "sender_club_player_id") REFERENCES "club_players"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_slot_transfers" ADD CONSTRAINT "session_slot_transfers_sender_player_id_fkey" FOREIGN KEY ("sender_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_slot_transfers" ADD CONSTRAINT "session_slot_transfers_recipient_player_id_fkey" FOREIGN KEY ("recipient_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_slot_transfers" ADD CONSTRAINT "session_slot_transfers_club_id_recipient_club_player_id_fkey" FOREIGN KEY ("club_id", "recipient_club_player_id") REFERENCES "club_players"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_slot_transfers" ADD CONSTRAINT "session_slot_transfers_club_id_session_id_recipient_sessio_fkey" FOREIGN KEY ("club_id", "session_id", "recipient_session_player_id") REFERENCES "session_players"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_slot_transfers" ADD CONSTRAINT "session_slot_transfers_club_id_decided_by_device_id_fkey" FOREIGN KEY ("club_id", "decided_by_device_id") REFERENCES "devices"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_slot_transfers" ADD CONSTRAINT "session_slot_transfers_withdrawn_by_player_id_fkey" FOREIGN KEY ("withdrawn_by_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Hand-written: one pending transfer per sender roster entry (one slot, one request at a time).
CREATE UNIQUE INDEX "session_slot_transfers_one_pending_per_entry"
  ON "session_slot_transfers" ("sender_session_player_id") WHERE "status" = 'pending';

-- Hand-written: status coherence.
-- A pending transfer has no decision time; every final status has one.
-- An approved transfer names the recipient, their saved player, the entry that now holds the slot and
-- whether they came from the waitlist. Nobody transfers to themselves.
-- Only the Queue Master's Approve or Reject records a device; only a withdrawal records who withdrew.
ALTER TABLE "session_slot_transfers"
  ADD CONSTRAINT "session_slot_transfers_decided_check"
    CHECK (("status" = 'pending') = ("decided_at" IS NULL)),
  ADD CONSTRAINT "session_slot_transfers_approved_check"
    CHECK ("status" <> 'approved' OR ("recipient_player_id" IS NOT NULL
      AND "recipient_club_player_id" IS NOT NULL AND "recipient_session_player_id" IS NOT NULL
      AND "recipient_was_waitlisted" IS NOT NULL)),
  ADD CONSTRAINT "session_slot_transfers_recipient_set_on_approval_only"
    CHECK ("status" = 'approved' OR ("recipient_club_player_id" IS NULL
      AND "recipient_session_player_id" IS NULL AND "recipient_was_waitlisted" IS NULL)),
  ADD CONSTRAINT "session_slot_transfers_not_self"
    CHECK ("recipient_player_id" IS DISTINCT FROM "sender_player_id"),
  ADD CONSTRAINT "session_slot_transfers_device_check"
    CHECK ("decided_by_device_id" IS NULL OR "status" IN ('approved', 'rejected')),
  ADD CONSTRAINT "session_slot_transfers_withdrawn_check"
    CHECK (("withdrawn_by_player_id" IS NOT NULL) = ("status" = 'withdrawn'));

-- Hand-written: immutable once decided. A pending row moves once to a final status; a final row is
-- never updated or deleted, and no row is ever deleted (the chain of custody stays whole).
CREATE FUNCTION "session_slot_transfers_final"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD."status" <> 'pending' THEN
    RAISE EXCEPTION 'slot transfer % is final', OLD."id" USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "session_slot_transfers_final"
  BEFORE UPDATE OR DELETE ON "session_slot_transfers"
  FOR EACH ROW EXECUTE FUNCTION "session_slot_transfers_final"();

-- Server-only table: the Route Handlers' runtime role writes it; no Supabase client role does.
ALTER TABLE "session_slot_transfers" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "session_slot_transfers" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION "session_slot_transfers_final"() FROM PUBLIC;
