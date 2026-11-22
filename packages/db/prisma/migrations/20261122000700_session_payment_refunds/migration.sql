-- Manual full refunds and FIFO waitlist promotion (#1014, epic #1009; owner decisions #1015,
-- November 22, 2026; D-2026-11-22-06). Applied to a local disposable database 2026-11-22 only; not
-- applied to the shared database: owner sign-off needed.
-- Additive: one enum, one value on roster_release_reason, one append-only table and three triggers.
-- ROTRA moves no money: a refund row records that the Queue Master handed cash back outside ROTRA.
-- No existing row changes meaning; payment marks are never rewritten.

-- CreateEnum
CREATE TYPE "payment_refund_reason" AS ENUM ('transfer_rejected', 'session_cancelled');

-- AlterEnum
ALTER TYPE "roster_release_reason" ADD VALUE 'refunded';

-- CreateTable
CREATE TABLE "session_payment_refunds" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "session_player_id" UUID NOT NULL,
    "reason" "payment_refund_reason" NOT NULL,
    "slot_transfer_id" UUID,
    "amount_minor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PHP',
    "refunded_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_payment_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "session_payment_refunds_slot_transfer_id_key" ON "session_payment_refunds"("slot_transfer_id");

-- CreateIndex
CREATE INDEX "session_payment_refunds_club_id_session_id_idx" ON "session_payment_refunds"("club_id", "session_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_payment_refunds_session_id_session_player_id_key" ON "session_payment_refunds"("session_id", "session_player_id");

-- AddForeignKey
ALTER TABLE "session_payment_refunds" ADD CONSTRAINT "session_payment_refunds_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "queue_sessions"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_payment_refunds" ADD CONSTRAINT "session_payment_refunds_club_id_session_id_session_player__fkey" FOREIGN KEY ("club_id", "session_id", "session_player_id") REFERENCES "session_players"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_payment_refunds" ADD CONSTRAINT "session_payment_refunds_club_id_session_id_slot_transfer_i_fkey" FOREIGN KEY ("club_id", "session_id", "slot_transfer_id") REFERENCES "session_slot_transfers"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Hand-written: full refunds only. The amount is the whole cash collected for the slot at the time
-- (computed by the service from the payment marks and the transfer snapshots), always above 0; a
-- slot that only holds a waiver has nothing to refund. A Reject and refund names its transfer; a
-- cancelled session's refund names none.
ALTER TABLE "session_payment_refunds"
  ADD CONSTRAINT "session_payment_refunds_amount_check" CHECK ("amount_minor" > 0),
  ADD CONSTRAINT "session_payment_refunds_currency_check" CHECK ("currency" = 'PHP'),
  ADD CONSTRAINT "session_payment_refunds_transfer_check"
    CHECK (("reason" = 'transfer_rejected') = ("slot_transfer_id" IS NOT NULL));

-- Hand-written: a refund matches what it refunds. A transfer refund belongs to a rejected transfer
-- whose sender is the refunded entry; a session refund belongs to a cancelled session.
CREATE FUNCTION "session_payment_refunds_coherent"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."reason" = 'transfer_rejected' AND NOT EXISTS (
    SELECT 1 FROM "session_slot_transfers" t
    WHERE t."id" = NEW."slot_transfer_id" AND t."status" = 'rejected'
      AND t."sender_session_player_id" = NEW."session_player_id"
  ) THEN
    RAISE EXCEPTION 'refund % must belong to the rejected transfer of its entry', NEW."id"
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW."reason" = 'session_cancelled' AND NOT EXISTS (
    SELECT 1 FROM "queue_sessions" s WHERE s."id" = NEW."session_id" AND s."state" = 'cancelled'
  ) THEN
    RAISE EXCEPTION 'refund % must belong to a cancelled session', NEW."id"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "session_payment_refunds_coherent"
  BEFORE INSERT ON "session_payment_refunds"
  FOR EACH ROW EXECUTE FUNCTION "session_payment_refunds_coherent"();

-- Hand-written: append-only. A refund is never updated or deleted (one per entry, unique above).
CREATE FUNCTION "session_payment_refunds_final"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'payment refund % is final', OLD."id" USING ERRCODE = 'restrict_violation';
END;
$$;
CREATE TRIGGER "session_payment_refunds_final"
  BEFORE UPDATE OR DELETE ON "session_payment_refunds"
  FOR EACH ROW EXECUTE FUNCTION "session_payment_refunds_final"();

-- Hand-written: the original payment stays in the audit history. Once an entry was refunded, its
-- payment mark is never updated or deleted again (the refund row records the money handed back).
CREATE FUNCTION "session_payment_marks_frozen_by_refund"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "session_payment_refunds" r WHERE r."session_player_id" = OLD."session_player_id"
  ) THEN
    RAISE EXCEPTION 'payment mark for % was refunded', OLD."session_player_id"
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER "session_payment_marks_frozen_by_refund"
  BEFORE UPDATE OR DELETE ON "session_payment_marks"
  FOR EACH ROW EXECUTE FUNCTION "session_payment_marks_frozen_by_refund"();

-- Server-only table: the Route Handlers' runtime role writes it; no Supabase client role does.
ALTER TABLE "session_payment_refunds" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "session_payment_refunds" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION "session_payment_refunds_coherent"() FROM PUBLIC;
REVOKE ALL ON FUNCTION "session_payment_refunds_final"() FROM PUBLIC;
REVOKE ALL ON FUNCTION "session_payment_marks_frozen_by_refund"() FROM PUBLIC;
