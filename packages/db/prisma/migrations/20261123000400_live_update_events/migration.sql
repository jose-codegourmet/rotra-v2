-- Live-update events (track live-updates, go-writes-queue R4; B-25, B-26, B-34, B-48, B-49, B-50).
-- Design: docs/database_design/product/live-updates.md (approved by the owner November 15, 2026, B-50).
--
-- Owner signed off this SQL on 2026-11-25 (B-36). Before that it was applied to throwaway test databases only, never to the
-- shared database. Needs PostgreSQL 13 or later (xid8 and pg_current_xact_id()); confirm on Railway and Supabase first.
-- Additive: one table, one index and one nullable column. No existing row changes meaning.
--
-- Deploy order: apply this before the API build that appends events. Every Go write adds its event in its own transaction,
-- so an API without this table would fail those writes.

-- CreateTable
CREATE TABLE live_update_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  xact_id     xid8 NOT NULL DEFAULT pg_current_xact_id(),
  club_id     uuid NOT NULL,
  session_id  uuid,                        -- null for club-wide changes
  player_ids  uuid[] NOT NULL DEFAULT '{}', -- registered players whose own results changed
  kind        text NOT NULL CHECK (kind <> ''),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- CreateIndex
CREATE INDEX live_update_events_cursor ON live_update_events (xact_id, id);

-- AlterTable: the session's snapshot version (B-25). Null until the first event. No foreign key: old events are deleted.
ALTER TABLE queue_sessions ADD COLUMN latest_event_id bigint;

-- Same lockdown as the other tables (20261122000400): Supabase's API roles never read or write it.
ALTER TABLE live_update_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE live_update_events FROM anon, authenticated, PUBLIC;

-- The Go API's database role (see 20261119000200): the table is written by every write, read by the publisher and cleaned
-- up by the housekeeping loop. A no-op where the role does not exist (a local database, CI); GRANT is idempotent.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rotra_api') THEN
    RAISE NOTICE 'role rotra_api does not exist: live_update_events grants skipped';
    RETURN;
  END IF;
  GRANT SELECT, INSERT, DELETE ON TABLE public.live_update_events TO rotra_api;
END
$$;
