-- P15.8 (#927), D-2026-11-16-04 and D-2026-11-18-02, owner answers of November 18, 2026: the thin
-- shared entry of an unclaimed player (normalized email + RTR ID allocation, nothing a club typed),
-- club records pointing to it, the Same person redirect (`club_players.linked_to_club_player_id`,
-- designed in sessions-roster.md, not built until now), an Admin-only RTR ID change on
-- player_id_allocations, and one data step: club nicknames copied from the account onto linked
-- saved-player rows are cleared. Additive otherwise: nothing dropped, no record moved or deleted.
-- Apply to a shared database only after human sign-off.

-- AlterTable
ALTER TABLE "club_players" ADD COLUMN     "linked_to_club_player_id" UUID,
ADD COLUMN     "shared_entry_id" UUID;

-- CreateTable
CREATE TABLE "shared_player_entries" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "rtr_id" TEXT NOT NULL,
    "creating_club_id" UUID NOT NULL,
    "location_code_id" UUID NOT NULL,
    "country_code" TEXT NOT NULL,
    "city_code" TEXT NOT NULL,
    "sync_date" DATE NOT NULL,
    "sequence" INTEGER NOT NULL,
    "allocated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimed_player_id" UUID,
    "claimed_at" TIMESTAMPTZ(6),
    "retired_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "shared_player_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shared_player_entries_email_key" ON "shared_player_entries"("email");

-- CreateIndex
CREATE UNIQUE INDEX "shared_player_entries_rtr_id_key" ON "shared_player_entries"("rtr_id");

-- CreateIndex
CREATE UNIQUE INDEX "shared_player_entries_claimed_player_id_key" ON "shared_player_entries"("claimed_player_id");

-- CreateIndex
CREATE INDEX "shared_player_entries_creating_club_id_idx" ON "shared_player_entries"("creating_club_id");

-- CreateIndex
CREATE UNIQUE INDEX "shared_player_entries_location_code_id_sync_date_sequence_key" ON "shared_player_entries"("location_code_id", "sync_date", "sequence");

-- CreateIndex
CREATE INDEX "club_players_shared_entry_id_idx" ON "club_players"("shared_entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_players_club_id_shared_entry_id_key" ON "club_players"("club_id", "shared_entry_id");

-- CreateIndex
CREATE INDEX "club_players_club_id_linked_to_club_player_id_idx" ON "club_players"("club_id", "linked_to_club_player_id");

-- AddForeignKey
ALTER TABLE "shared_player_entries" ADD CONSTRAINT "shared_player_entries_creating_club_id_fkey" FOREIGN KEY ("creating_club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_player_entries" ADD CONSTRAINT "shared_player_entries_location_code_id_fkey" FOREIGN KEY ("location_code_id") REFERENCES "location_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_player_entries" ADD CONSTRAINT "shared_player_entries_location_code_id_sync_date_fkey" FOREIGN KEY ("location_code_id", "sync_date") REFERENCES "player_id_counters"("location_code_id", "sync_date") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_player_entries" ADD CONSTRAINT "shared_player_entries_claimed_player_id_fkey" FOREIGN KEY ("claimed_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_players" ADD CONSTRAINT "club_players_club_id_linked_to_club_player_id_fkey" FOREIGN KEY ("club_id", "linked_to_club_player_id") REFERENCES "club_players"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_players" ADD CONSTRAINT "club_players_shared_entry_id_fkey" FOREIGN KEY ("shared_entry_id") REFERENCES "shared_player_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written: the entry's rules. The email is normalized like player_accounts.google_email; it is
-- set while the entry is open and cleared once it is claimed or retired (never both). The RTR ID
-- follows the player_id_allocations format and its frozen codes.
ALTER TABLE "shared_player_entries"
  ADD CONSTRAINT "shared_player_entries_email_check" CHECK (
    "email" IS NULL
    OR ("email" = lower(btrim("email")) AND "email" ~ '^[^@\s]+@[^@\s]+$')
  ),
  ADD CONSTRAINT "shared_player_entries_state_check" CHECK (
    ("claimed_player_id" IS NULL) = ("claimed_at" IS NULL)
    AND NOT ("claimed_player_id" IS NOT NULL AND "retired_at" IS NOT NULL)
    AND ("email" IS NULL) = ("claimed_player_id" IS NOT NULL OR "retired_at" IS NOT NULL)
  ),
  ADD CONSTRAINT "shared_player_entries_sequence_check" CHECK ("sequence" > 0),
  ADD CONSTRAINT "shared_player_entries_codes_check" CHECK ("country_code" ~ '^[A-Z]{2}$' AND "city_code" ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "shared_player_entries_rtr_id_check" CHECK (
    "rtr_id" ~ '^RTR-[A-Z]{2}-[A-Z]{3}-[0-9]{6}-[0-9]{4,}$'
    AND "rtr_id" LIKE ('RTR-' || "country_code" || '-' || "city_code" || '-%')
  );

-- The Same person move (sessions-roster.md `linked_to_club_player_id`): a record moved into another
-- saved player of the same club (composite FK above) is hidden, and never into itself.
ALTER TABLE "club_players"
  ADD CONSTRAINT "club_players_linked_to_check" CHECK (
    "linked_to_club_player_id" IS NULL
    OR ("removed_at" IS NOT NULL AND "linked_to_club_player_id" <> "id")
  );

ALTER TABLE "shared_player_entries" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "shared_player_entries" FROM anon, authenticated, PUBLIC;

-- Admin's RTR ID change (D-2026-11-16-04): player_id_allocations stays append-only, except one
-- UPDATE of the place and date (rtr_id, location, frozen codes, sync day) inside a transaction that
-- set `rotra.rtr_id_change` to 'on' (SET LOCAL / set_config(..., true)). The player, creating club,
-- sequence and allocation time never change; DELETE stays refused.
CREATE FUNCTION "player_id_allocations_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND coalesce(current_setting('rotra.rtr_id_change', true), '') = 'on'
    AND NEW."player_id" = OLD."player_id"
    AND NEW."creating_club_id" = OLD."creating_club_id"
    AND NEW."sequence" = OLD."sequence"
    AND NEW."allocated_at" = OLD."allocated_at"
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'restrict_violation';
END;
$$;
REVOKE ALL ON FUNCTION "player_id_allocations_guard"() FROM PUBLIC;

DROP TRIGGER "player_id_allocations_append_only" ON "player_id_allocations";
CREATE TRIGGER "player_id_allocations_append_only"
  BEFORE UPDATE OR DELETE ON "player_id_allocations"
  FOR EACH ROW EXECUTE FUNCTION "player_id_allocations_guard"();

-- Data step (owner answer, November 18, 2026; D-2026-11-18-02): `club_players.nickname` of a
-- linked saved player is now the club nickname. Before this rule, adding a registered player copied
-- the account nickname there, which would now show as a club nickname. Clear it only where it is
-- exactly the linked player's account nickname after trimming (case-sensitive); any other text is
-- kept as the club's nickname.
UPDATE "club_players" AS cp
SET "nickname" = NULL, "revision" = cp."revision" + 1, "updated_at" = now()
FROM "players" AS p
WHERE cp."player_id" = p."id"
  AND cp."nickname" IS NOT NULL
  AND p."nickname" IS NOT NULL
  AND btrim(cp."nickname") = btrim(p."nickname");
