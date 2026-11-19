-- Self check-in in real mode (D-2026-11-09-03; ticket draft F07.63): the Player's own I'm here and
-- I'm leaving marks on the roster entry, and the club's switch that turns self check-in off.
-- Additive. Two nullable timestamps and one boolean with a default, so existing rows read as
-- "no mark" and "self check-in on". The level-lock trigger is unchanged (neither mark is a locked
-- column). The marks are history: a later presence change by the Queue Master moves
-- present_changed_at past them, which is what hides the mark; nothing clears them.

-- AlterTable
ALTER TABLE "session_players" ADD COLUMN     "self_checked_in_at" TIMESTAMPTZ(6),
ADD COLUMN     "left_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "self_check_in_enabled" BOOLEAN NOT NULL DEFAULT true;
