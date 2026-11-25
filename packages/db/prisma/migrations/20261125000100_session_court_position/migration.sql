-- Court order (owner decision, 2026-11-25): the Queue Master can reorder a session's courts, and
-- that order is used everywhere courts are listed and by Auto Queue's fill in court order. Two
-- courts in one session may now share a label, so the live-label unique index goes.
-- Backfill: each session's courts, removed ones included, numbered 1.. by created_at then id (the
-- order every read used until now). No unique on position: a reorder rewrites many rows at once.
BEGIN;

ALTER TABLE "session_courts" ADD COLUMN "position" INTEGER;

UPDATE "session_courts" AS c
SET "position" = o."position"
FROM (
  SELECT "id", row_number() OVER (PARTITION BY "session_id" ORDER BY "created_at", "id") AS "position"
  FROM "session_courts"
) AS o
WHERE c."id" = o."id";

ALTER TABLE "session_courts" ALTER COLUMN "position" SET NOT NULL;

ALTER TABLE "session_courts"
  ADD CONSTRAINT "session_courts_position_check" CHECK ("position" > 0);

DROP INDEX "session_courts_live_label_key";

COMMIT;
