-- Transfer invite links: signup, first claimant and invalidation (#1012, epic #1009; owner decisions
-- #1015, November 22, 2026; D-2026-11-22-04). Applied to a local disposable database 2026-11-22 only;
-- not applied to the shared database: owner sign-off needed.
-- Additive: two nullable columns on session_slot_transfers. Every existing row is a transfer by RTR ID
-- (recipient set, no link) and already satisfies the new CHECKs.
-- AlterTable
ALTER TABLE "session_slot_transfers" ADD COLUMN     "claimed_at" TIMESTAMPTZ(6),
ADD COLUMN     "link_token_digest" BYTEA;

-- CreateIndex
CREATE UNIQUE INDEX "session_slot_transfers_link_token_digest_key" ON "session_slot_transfers"("link_token_digest");


-- Hand-written: a transfer names its recipient (by RTR ID) or is a link (recipient null until claimed).
-- A link has a claim time exactly when it has a claimant. The Queue Master only ever sees, and so only
-- rejects, a transfer that names a recipient (approval already requires one).
-- The token digest is SHA-256: 32 bytes.
ALTER TABLE "session_slot_transfers"
  ADD CONSTRAINT "session_slot_transfers_link_or_recipient"
    CHECK ("recipient_player_id" IS NOT NULL OR "link_token_digest" IS NOT NULL),
  ADD CONSTRAINT "session_slot_transfers_claimed_check"
    CHECK (("claimed_at" IS NOT NULL) = ("link_token_digest" IS NOT NULL AND "recipient_player_id" IS NOT NULL)),
  ADD CONSTRAINT "session_slot_transfers_rejected_check"
    CHECK ("status" <> 'rejected' OR "recipient_player_id" IS NOT NULL),
  ADD CONSTRAINT "session_slot_transfers_link_digest_length"
    CHECK ("link_token_digest" IS NULL OR octet_length("link_token_digest") = 32);

-- Hand-written: still immutable once decided; while pending, one claimant per link. The recipient is
-- set at most once (a second claimant is refused even if the service check were skipped), and the
-- link's token and claim time never change. A new link is a new row.
CREATE OR REPLACE FUNCTION "session_slot_transfers_final"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD."status" <> 'pending' THEN
    RAISE EXCEPTION 'slot transfer % is final', OLD."id" USING ERRCODE = 'restrict_violation';
  END IF;
  IF NEW."link_token_digest" IS DISTINCT FROM OLD."link_token_digest"
    OR (OLD."recipient_player_id" IS NOT NULL AND NEW."recipient_player_id" IS DISTINCT FROM OLD."recipient_player_id")
    OR (OLD."claimed_at" IS NOT NULL AND NEW."claimed_at" IS DISTINCT FROM OLD."claimed_at") THEN
    RAISE EXCEPTION 'slot transfer % already has its recipient', OLD."id" USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION "session_slot_transfers_final"() FROM PUBLIC;
