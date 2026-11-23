-- Payment transfer accounting: partial waiver, repeat transfers and audit (#1013, epic #1009; owner
-- decisions #1015, November 22, 2026; D-2026-11-22-05). Applied to a local disposable database
-- 2026-11-22 only; not applied to the shared database: owner sign-off needed.
-- Additive: five nullable columns on session_slot_transfers, written only by an approval, and one
-- trigger that freezes a payment mark once its slot was transferred. No existing row changes meaning.

-- AlterTable
ALTER TABLE "session_slot_transfers" ADD COLUMN     "amount_due_minor" INTEGER,
ADD COLUMN     "amount_paid_minor" INTEGER,
ADD COLUMN     "currency" CHAR(3),
ADD COLUMN     "prior_waived_minor" INTEGER,
ADD COLUMN     "waived_minor" INTEGER;

-- Hand-written: the payment snapshot is written by the approval and only then (the final-row trigger
-- keeps it unchanged after). Amounts are centavos, never negative. The waiver is exactly what the
-- slot still owed: due − cash collected − earlier waivers, never below 0, and 0 with no fee set.
-- A waiver is a record, never cash: collected totals read the payment marks only.
ALTER TABLE "session_slot_transfers"
  ADD CONSTRAINT "session_slot_transfers_payment_on_approval_only"
    CHECK ("status" = 'approved' OR ("amount_due_minor" IS NULL AND "amount_paid_minor" IS NULL
      AND "prior_waived_minor" IS NULL AND "waived_minor" IS NULL AND "currency" IS NULL)),
  ADD CONSTRAINT "session_slot_transfers_payment_check"
    CHECK ("status" <> 'approved' OR ("amount_paid_minor" IS NOT NULL
      AND "prior_waived_minor" IS NOT NULL AND "waived_minor" IS NOT NULL AND "currency" IS NOT NULL)),
  ADD CONSTRAINT "session_slot_transfers_payment_nonnegative"
    CHECK (("amount_due_minor" IS NULL OR "amount_due_minor" >= 0)
      AND ("amount_paid_minor" IS NULL OR "amount_paid_minor" >= 0)
      AND ("prior_waived_minor" IS NULL OR "prior_waived_minor" >= 0)
      AND ("waived_minor" IS NULL OR "waived_minor" >= 0)),
  ADD CONSTRAINT "session_slot_transfers_waiver_check"
    CHECK ("waived_minor" IS NULL OR "waived_minor" = CASE WHEN "amount_due_minor" IS NULL THEN 0
      ELSE GREATEST("amount_due_minor" - "amount_paid_minor" - "prior_waived_minor", 0) END),
  ADD CONSTRAINT "session_slot_transfers_currency_check"
    CHECK ("currency" IS NULL OR "currency" = 'PHP');

-- Hand-written: a payment mark is frozen once its slot was transferred. The approval snapshots the
-- cash on the transfer row and the recipient's entry carries it, so the sender's mark (recorded at
-- or before the approval) is part of the immutable chain: never updated or deleted again. Deleting a
-- whole session cannot reach these rows either (transfer rows restrict their roster entries).
CREATE FUNCTION "session_payment_marks_frozen_by_transfer"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "session_slot_transfers" t
    WHERE t."sender_session_player_id" = OLD."session_player_id"
      AND t."status" = 'approved'
      AND t."decided_at" >= OLD."marked_at"
  ) THEN
    RAISE EXCEPTION 'payment mark for % is part of an approved slot transfer', OLD."session_player_id"
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER "session_payment_marks_frozen_by_transfer"
  BEFORE UPDATE OR DELETE ON "session_payment_marks"
  FOR EACH ROW EXECUTE FUNCTION "session_payment_marks_frozen_by_transfer"();

-- Server-only: no Supabase client role calls it (the tables are already server-only).
REVOKE ALL ON FUNCTION "session_payment_marks_frozen_by_transfer"() FROM PUBLIC;
