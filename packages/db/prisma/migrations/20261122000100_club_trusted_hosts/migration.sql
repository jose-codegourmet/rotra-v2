-- Epic #1002 / #1003, D-2026-11-22-01: a club's trusted-host list, drawn from its saved players
-- (club_players, guests and unclaimed players included). Hosting is informational, never
-- authorization: no role, permission or sign-in changes. Removing a trusted host is a soft end
-- (`removed_at`), so the saved player, past rows and later session host records stay intact.
-- Additive only: one new table, nothing dropped, no row moved. Apply to a shared database only after
-- human sign-off.

-- CreateTable
CREATE TABLE "club_trusted_hosts" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "club_player_id" UUID NOT NULL,
    "added_at" TIMESTAMPTZ(6) NOT NULL,
    "removed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "club_trusted_hosts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "club_trusted_hosts_club_id_club_player_id_idx" ON "club_trusted_hosts"("club_id", "club_player_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_trusted_hosts_club_id_id_key" ON "club_trusted_hosts"("club_id", "id");

-- AddForeignKey
ALTER TABLE "club_trusted_hosts" ADD CONSTRAINT "club_trusted_hosts_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_trusted_hosts" ADD CONSTRAINT "club_trusted_hosts_club_id_club_player_id_fkey" FOREIGN KEY ("club_id", "club_player_id") REFERENCES "club_players"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written: one current trusted-host row per saved player of a club; removed rows stay as history.
CREATE UNIQUE INDEX "club_trusted_hosts_one_current" ON "club_trusted_hosts" ("club_id", "club_player_id") WHERE "removed_at" IS NULL;

ALTER TABLE "club_trusted_hosts"
  ADD CONSTRAINT "club_trusted_hosts_removed_after_added_check" CHECK ("removed_at" IS NULL OR "removed_at" >= "added_at");

ALTER TABLE "club_trusted_hosts" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "club_trusted_hosts" FROM anon, authenticated, PUBLIC;
