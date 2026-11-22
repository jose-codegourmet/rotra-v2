-- Epic #1002 / #1008, D-2026-11-22-01: finished sessions keep their hosts. Each session_hosts row
-- carries the host's name as it was when they were assigned (`name_snapshot`), and the rows that were
-- current when the session ended (Session done, or Mark session invalid) are refreshed and frozen in
-- that same transaction (`frozen_at`). A finished session's Hosts are its frozen rows, read by their
-- snapshot, so they still show after the club removes the trusted host, deletes the saved player
-- (club_players.removed_at) or moves the record into another (linked_to_club_player_id). A host removed
-- before the end (`removed_at`) is never frozen and is not a host of the finished session. Hosting
-- stays informational: no role, permission or sign-in changes. Additive: two columns (backfilled),
-- one check and one guard trigger; nothing dropped, no row moved. Apply to a shared database only
-- after human sign-off.

-- AlterTable
ALTER TABLE "session_hosts" ADD COLUMN "name_snapshot" TEXT,
ADD COLUMN "frozen_at" TIMESTAMPTZ(6);

-- Hand-written backfill: the saved player's name now (the ROTRA full name for a linked record, like
-- the service writes it), then the rows still current on an ended session are frozen at its end.
UPDATE "session_hosts" h
SET "name_snapshot" = COALESCE(NULLIF(p."full_name", ''), cp."display_name")
FROM "club_players" cp
LEFT JOIN "players" p ON p."id" = cp."player_id"
WHERE cp."club_id" = h."club_id" AND cp."id" = h."club_player_id";

UPDATE "session_hosts" h
SET "frozen_at" = COALESCE(s."finalized_at", s."updated_at")
FROM "queue_sessions" s
WHERE s."club_id" = h."club_id" AND s."id" = h."session_id"
  AND s."state" IN ('completed', 'invalid') AND h."removed_at" IS NULL;

ALTER TABLE "session_hosts" ALTER COLUMN "name_snapshot" SET NOT NULL;

-- A frozen row is a host of the finished session: never one removed before the end.
ALTER TABLE "session_hosts"
  ADD CONSTRAINT "session_hosts_frozen_current_check" CHECK ("frozen_at" IS NULL OR "removed_at" IS NULL),
  ADD CONSTRAINT "session_hosts_name_snapshot_check" CHECK (length(btrim("name_snapshot")) > 0);

-- Hand-written: frozen rows are history. They are never deleted or changed, and a row is frozen only
-- on a session that has ended (completed, or invalid).
CREATE FUNCTION "session_hosts_frozen_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."frozen_at" IS NOT NULL THEN
      RAISE EXCEPTION 'session host % is frozen', OLD."id" USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD."frozen_at" IS NOT NULL AND (
    NEW."club_id", NEW."session_id", NEW."club_player_id", NEW."assigned_at", NEW."removed_at",
    NEW."name_snapshot", NEW."frozen_at"
  ) IS DISTINCT FROM (
    OLD."club_id", OLD."session_id", OLD."club_player_id", OLD."assigned_at", OLD."removed_at",
    OLD."name_snapshot", OLD."frozen_at"
  ) THEN
    RAISE EXCEPTION 'session host % is frozen', OLD."id" USING ERRCODE = 'restrict_violation';
  END IF;
  IF NEW."frozen_at" IS NOT NULL AND (TG_OP = 'INSERT' OR OLD."frozen_at" IS NULL) AND NOT EXISTS (
    SELECT 1 FROM "queue_sessions" s
    WHERE s."club_id" = NEW."club_id" AND s."id" = NEW."session_id" AND s."state" IN ('completed', 'invalid')
  ) THEN
    RAISE EXCEPTION 'session hosts are frozen only when the session ends' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "session_hosts_frozen_guard"
  BEFORE INSERT OR UPDATE OR DELETE ON "session_hosts"
  FOR EACH ROW EXECUTE FUNCTION "session_hosts_frozen_guard"();

REVOKE ALL ON FUNCTION "session_hosts_frozen_guard"() FROM PUBLIC;
