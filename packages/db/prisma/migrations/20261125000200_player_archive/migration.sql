-- Admin Players › Archive / Restore in real mode (owner, November 25, 2026). Reversible: an archived
-- player is left out of club pickers and directories; sign-in and history are untouched. Additive:
-- every existing row stays null (not archived); no backfill. `revision` already exists.
BEGIN;

ALTER TABLE "players" ADD COLUMN "archived_at" TIMESTAMPTZ(6);

COMMIT;
