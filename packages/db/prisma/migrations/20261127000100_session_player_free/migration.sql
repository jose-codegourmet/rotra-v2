-- Plays free (D-2026-11-27-01): the Queue Master marked this roster entry free on Payments. A free
-- entry owes nothing and leaves the head count of the break-even share; costs stay the same.
-- Setting it clears the entry's own payment mark (payments are a guide only, nothing to
-- reimburse); recording a mark clears it. Session only; never copied to club players.
BEGIN;

ALTER TABLE "session_players"
  ADD COLUMN "is_free" BOOLEAN NOT NULL DEFAULT false;

COMMIT;
