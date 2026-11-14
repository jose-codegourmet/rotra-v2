-- No show (cancelled) on the live Players view (2026-11-13-queue-no-show-cancelled, Q20.7 #839).
-- Additive. A nullable timestamp, plus a hand-written CHECK: an entry is never both released and a
-- no show. The level-lock trigger is unchanged (no_show_at is not a locked column).

-- AlterTable
ALTER TABLE "session_players" ADD COLUMN     "no_show_at" TIMESTAMPTZ(6);

-- Hand-written: a no show stays a live (unreleased) entry; release and no show never coexist.
ALTER TABLE "session_players"
  ADD CONSTRAINT "session_players_no_show_check" CHECK ("no_show_at" IS NULL OR "released_at" IS NULL);
