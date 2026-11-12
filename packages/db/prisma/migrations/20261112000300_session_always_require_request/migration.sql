-- #764 (owner decision November 12, 2026, D-2026-11-12-02): the Queue Master's Always require a request
-- switch on the Session link card. Off by default: a club member (a registered Player linked to one of
-- the club's current saved player records) joins an upcoming session right away; on, members send a
-- join request like everyone else. Read as off while accept_join_requests is false. Additive: one
-- NOT NULL column with a default, so every existing session keeps today's default.

-- AlterTable
ALTER TABLE "queue_sessions"
  ADD COLUMN "always_require_request" BOOLEAN NOT NULL DEFAULT false;
