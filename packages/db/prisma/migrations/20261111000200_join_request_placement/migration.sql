-- D-2026-11-11-02 / #706: the player's choice on a join request — Join a slot, Be waitlisted, or a
-- waitlisted Player asking for a slot. Additive: one enum and one NOT NULL column with a default, so
-- every existing row reads `slot` (what a request meant before). Drafted only; apply to a shared
-- database after human sign-off.

-- CreateEnum
CREATE TYPE "join_request_placement" AS ENUM ('slot', 'waitlist', 'from_waitlist');

-- AlterTable
ALTER TABLE "session_join_requests"
  ADD COLUMN "placement" "join_request_placement" NOT NULL DEFAULT 'slot';
