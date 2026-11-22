-- Epic #1002 / #1004, D-2026-11-22-01: a Queue Session's hosts, drawn from the club's saved players
-- (club_players). Hosting is informational, never authorization: no role, permission or sign-in
-- changes. Assigning a host also registers them on the roster (session_players or session_waitlist),
-- written by the service in the same transaction; that row is separate, so ending a host row
-- (`removed_at`) never removes the registration. Additive only: one new table, nothing dropped, no row
-- moved. Apply to a shared database only after human sign-off.

-- CreateTable
CREATE TABLE "session_hosts" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "club_player_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL,
    "removed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "session_hosts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_hosts_club_id_session_id_idx" ON "session_hosts"("club_id", "session_id");

-- CreateIndex
CREATE INDEX "session_hosts_club_id_club_player_id_idx" ON "session_hosts"("club_id", "club_player_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_hosts_club_id_id_key" ON "session_hosts"("club_id", "id");

-- AddForeignKey
ALTER TABLE "session_hosts" ADD CONSTRAINT "session_hosts_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_hosts" ADD CONSTRAINT "session_hosts_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "queue_sessions"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_hosts" ADD CONSTRAINT "session_hosts_club_id_club_player_id_fkey" FOREIGN KEY ("club_id", "club_player_id") REFERENCES "club_players"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written: one current host row per saved player of a session; ended rows stay as history.
CREATE UNIQUE INDEX "session_hosts_one_current" ON "session_hosts" ("session_id", "club_player_id") WHERE "removed_at" IS NULL;

ALTER TABLE "session_hosts"
  ADD CONSTRAINT "session_hosts_removed_after_assigned_check" CHECK ("removed_at" IS NULL OR "removed_at" >= "assigned_at");

ALTER TABLE "session_hosts" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "session_hosts" FROM anon, authenticated, PUBLIC;
