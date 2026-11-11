-- P08.1 (D-2026-11-11-11, D-2026-11-09-08, D-2026-11-11-03): three-level profile visibility, hide
-- from Player Information, the Admin-managed profile banner library with the player's banner link,
-- the club invite code, and club-only unclaimed profiles. Owner signed off the migration on
-- November 12, 2026. Prisma diff output first (CreateEnum … AddForeignKey), then hand-written
-- CHECKs, seeds, grants and the data backfill. See README.md in this folder.
-- Prisma does not wrap a migration in a transaction; this one is all-or-nothing, so a refused
-- backfill leaves the database exactly as it was. The refusal check runs first and on its own, so
-- the error Prisma reports is the reason itself and not "current transaction is aborted".

-- Pre-check for the club-only backfill below (same rule, explained there).
DO $$
DECLARE
  hard_count integer;
BEGIN
  SELECT count(*) INTO hard_count
  FROM "players" p
  WHERE p."profile_state" = 'unclaimed'
    AND EXISTS (SELECT 1 FROM "club_players" cp WHERE cp."player_id" = p."id")
    AND (EXISTS (SELECT 1 FROM "player_match_facts" f WHERE f."player_id_at_finalization" = p."id")
      OR EXISTS (SELECT 1 FROM "club_assessments" a WHERE a."player_id_at_assessment" = p."id")
      OR EXISTS (SELECT 1 FROM "player_history_attributions" h WHERE h."player_id" = p."id")
      OR EXISTS (SELECT 1 FROM "projection_jobs" j WHERE j."target_player_id" = p."id")
      OR EXISTS (SELECT 1 FROM "player_rank_current" r WHERE r."player_id" = p."id")
      OR EXISTS (SELECT 1 FROM "player_accounts" a WHERE a."player_id" = p."id")
      OR EXISTS (SELECT 1 FROM "player_contact_change_requests" c WHERE c."player_id" = p."id")
      OR EXISTS (SELECT 1 FROM "player_password_reset_requests" r WHERE r."player_id" = p."id")
      OR EXISTS (SELECT 1 FROM "player_social_links" s WHERE s."player_id" = p."id"));
  IF hard_count > 0 THEN
    RAISE EXCEPTION 'P08.1: % unclaimed player(s) have game history, attributions, projections, an account or requests that cannot be moved onto a club record; decide these before applying', hard_count
      USING ERRCODE = 'restrict_violation';
  END IF;
END
$$;

BEGIN;

-- CreateEnum
CREATE TYPE "profile_visibility" AS ENUM ('public', 'private', 'always_private');

-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "invite_code" TEXT;

-- AlterTable
-- Existing rows have no stored privacy flag today (the Private switch was mock-only), so every
-- existing profile becomes `public`; only rows created from now on default to `private`.
ALTER TABLE "players" ADD COLUMN     "banner_id" TEXT,
ADD COLUMN     "hidden_from_directory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profile_visibility" "profile_visibility" NOT NULL DEFAULT 'public';
ALTER TABLE "players" ALTER COLUMN "profile_visibility" SET DEFAULT 'private';

-- CreateTable
CREATE TABLE "profile_banners" (
    "id" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "shown" BOOLEAN NOT NULL DEFAULT true,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "number" INTEGER NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "profile_banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_banners_number_key" ON "profile_banners"("number");

-- CreateIndex
CREATE INDEX "profile_banners_uploaded_at_number_idx" ON "profile_banners"("uploaded_at", "number");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_invite_code_key" ON "clubs"("invite_code");

-- CreateIndex
CREATE INDEX "players_banner_id_idx" ON "players"("banner_id");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_banner_id_fkey" FOREIGN KEY ("banner_id") REFERENCES "profile_banners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------------------------
-- profile_banners: same rules as profile_characters. Seeded ids are lowercase keys the apps draw
-- from theme tokens (image ''); uploads use a lowercase UUID chosen by the Admin client and a
-- public Storage URL. At least 2 rows stay shown (enforced by the Admin server, not here).
ALTER TABLE "profile_banners"
  ADD CONSTRAINT "profile_banners_id_format" CHECK (
    "id" ~ '^[a-z]{1,24}$' OR "id" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  ADD CONSTRAINT "profile_banners_image_reference" CHECK (
    "image" = '' OR "image" LIKE 'data:image/%' OR "image" LIKE 'https://%'
  ),
  ADD CONSTRAINT "profile_banners_number_positive" CHECK ("number" > 0);

-- The six mock banners, all shown, in upload order: "Banner 1" … "Banner 6", one millisecond apart.
INSERT INTO "profile_banners" ("id", "image", "shown", "uploaded_at", "number") VALUES
  ('court',  '', true, TIMESTAMPTZ '2026-11-11 00:00:00+00' + 0 * INTERVAL '1 millisecond', 1),
  ('night',  '', true, TIMESTAMPTZ '2026-11-11 00:00:00+00' + 1 * INTERVAL '1 millisecond', 2),
  ('dusk',   '', true, TIMESTAMPTZ '2026-11-11 00:00:00+00' + 2 * INTERVAL '1 millisecond', 3),
  ('ember',  '', true, TIMESTAMPTZ '2026-11-11 00:00:00+00' + 3 * INTERVAL '1 millisecond', 4),
  ('sun',    '', true, TIMESTAMPTZ '2026-11-11 00:00:00+00' + 4 * INTERVAL '1 millisecond', 5),
  ('stripe', '', true, TIMESTAMPTZ '2026-11-11 00:00:00+00' + 5 * INTERVAL '1 millisecond', 6);

-- Reads and writes go through the Admin and Player servers only; no public-client privileges.
ALTER TABLE "profile_banners" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "profile_banners" FROM anon, authenticated, PUBLIC;


-- ---------------------------------------------------------------------------------------------
-- clubs.invite_code: one active code per club for /register/[clubId]?k=<code>; Regenerate
-- overwrites it. Uppercase letters and digits, 8–16 characters. Every existing club gets a random
-- 10-character code so its invite link works right away.
ALTER TABLE "clubs"
  ADD CONSTRAINT "clubs_invite_code_format" CHECK ("invite_code" IS NULL OR "invite_code" ~ '^[A-Z0-9]{8,16}$');

UPDATE "clubs"
SET "invite_code" = upper(substr(md5(random()::text || "id"::text || clock_timestamp()::text), 1, 10))
WHERE "invite_code" IS NULL;


-- ---------------------------------------------------------------------------------------------
-- D-2026-11-11-03: unclaimed profiles live only in their club, with no players row and no RTR ID.
-- Every unclaimed players row linked from at least one club_players row moves onto those club
-- records: its phone (if any) becomes the club record's private intake, its nickname fills a
-- missing club nickname, roster/hold/join-request snapshots that pointed at it are cleared (the
-- entries stay attached through club_player_id), its invite links are removed, its RTR ID
-- allocation is released and the players row is deleted.
--
-- Unclaimed rows with NO club record are left alone: those are in-flight registrations (the
-- registration service stages a players row + claim link before the account exists).
--
-- Rows with references that cannot be moved or cleared (append-only facts and assessments,
-- attributions, projection jobs, a rank projection, an account, contact or reset requests, social
-- links) stop the migration with an error listing the count, so the owner decides case by case;
-- the shared database had none when this was written (43 unclaimed rows, 45 club records, 5
-- invite links, 0 game references).
DO $$
DECLARE
  hard_count integer;
  moved_players integer;
  unlinked_records integer;
BEGIN
  CREATE TEMP TABLE rotra_p08_unclaimed AS
    SELECT p."id"
    FROM "players" p
    WHERE p."profile_state" = 'unclaimed'
      AND EXISTS (SELECT 1 FROM "club_players" cp WHERE cp."player_id" = p."id");

  SELECT count(*) INTO hard_count
  FROM rotra_p08_unclaimed m
  WHERE EXISTS (SELECT 1 FROM "player_match_facts" f WHERE f."player_id_at_finalization" = m."id")
     OR EXISTS (SELECT 1 FROM "club_assessments" a WHERE a."player_id_at_assessment" = m."id")
     OR EXISTS (SELECT 1 FROM "player_history_attributions" h WHERE h."player_id" = m."id")
     OR EXISTS (SELECT 1 FROM "projection_jobs" j WHERE j."target_player_id" = m."id")
     OR EXISTS (SELECT 1 FROM "player_rank_current" r WHERE r."player_id" = m."id")
     OR EXISTS (SELECT 1 FROM "player_accounts" a WHERE a."player_id" = m."id")
     OR EXISTS (SELECT 1 FROM "player_contact_change_requests" c WHERE c."player_id" = m."id")
     OR EXISTS (SELECT 1 FROM "player_password_reset_requests" r WHERE r."player_id" = m."id")
     OR EXISTS (SELECT 1 FROM "player_social_links" s WHERE s."player_id" = m."id");
  IF hard_count > 0 THEN
    RAISE EXCEPTION 'P08.1: % unclaimed player(s) have game history, attributions, projections, an account or requests that cannot be moved onto a club record; decide these before applying', hard_count
      USING ERRCODE = 'restrict_violation';
  END IF;

  -- The club record takes over the identity fields the players row carried.
  UPDATE "club_players" cp
  SET "nickname" = p."nickname", "revision" = cp."revision" + 1, "updated_at" = now()
  FROM "players" p
  WHERE p."id" = cp."player_id"
    AND cp."player_id" IN (SELECT "id" FROM rotra_p08_unclaimed)
    AND cp."nickname" IS NULL AND p."nickname" IS NOT NULL;

  -- Phone: an intake already resolved to the unclaimed player goes back to pending with the phone;
  -- a club record with no intake gets one from the player's private contact.
  UPDATE "club_player_private_inputs" i
  SET "state" = 'pending', "resolved_player_id" = NULL, "resolved_at" = NULL,
      "phone_e164" = COALESCE(i."phone_e164", c."phone_e164"),
      "revision" = i."revision" + 1, "updated_at" = now()
  FROM "club_players" cp
  LEFT JOIN "player_private_contacts" c ON c."player_id" = cp."player_id"
  WHERE i."club_player_id" = cp."id"
    AND cp."player_id" IN (SELECT "id" FROM rotra_p08_unclaimed);

  INSERT INTO "club_player_private_inputs"
    ("club_player_id", "club_id", "phone_e164", "captured_at", "state", "updated_at")
  SELECT cp."id", cp."club_id", c."phone_e164", c."created_at", 'pending', now()
  FROM "club_players" cp
  JOIN "player_private_contacts" c ON c."player_id" = cp."player_id"
  WHERE cp."player_id" IN (SELECT "id" FROM rotra_p08_unclaimed)
    AND NOT EXISTS (SELECT 1 FROM "club_player_private_inputs" i WHERE i."club_player_id" = cp."id");

  -- Snapshots that pointed at the global row: cleared; the rows stay attached to the club record.
  UPDATE "session_players" SET "player_id_at_entry" = NULL
  WHERE "player_id_at_entry" IN (SELECT "id" FROM rotra_p08_unclaimed);
  UPDATE "active_player_holds" SET "player_id" = NULL
  WHERE "player_id" IN (SELECT "id" FROM rotra_p08_unclaimed);
  UPDATE "session_join_requests" SET "player_id" = NULL, "revision" = "revision" + 1, "updated_at" = now()
  WHERE "player_id" IN (SELECT "id" FROM rotra_p08_unclaimed);

  -- Invite links pointed at the players row; the club reissues them against its own record.
  DELETE FROM "player_claim_links" WHERE "player_id" IN (SELECT "id" FROM rotra_p08_unclaimed);

  UPDATE "club_players"
  SET "player_id" = NULL, "revision" = "revision" + 1, "updated_at" = now()
  WHERE "player_id" IN (SELECT "id" FROM rotra_p08_unclaimed);
  GET DIAGNOSTICS unlinked_records = ROW_COUNT;

  -- Release the RTR IDs. The allocation table is append-only by trigger; this one-off release is
  -- the owner's decision (D-2026-11-11-03: an unclaimed profile has no RTR ID). Counters are not
  -- rewound, so released sequence numbers are never reused.
  ALTER TABLE "player_id_allocations" DISABLE TRIGGER "player_id_allocations_append_only";
  DELETE FROM "player_id_allocations" WHERE "player_id" IN (SELECT "id" FROM rotra_p08_unclaimed);
  ALTER TABLE "player_id_allocations" ENABLE TRIGGER "player_id_allocations_append_only";

  DELETE FROM "player_private_contacts" WHERE "player_id" IN (SELECT "id" FROM rotra_p08_unclaimed);
  DELETE FROM "players" WHERE "id" IN (SELECT "id" FROM rotra_p08_unclaimed);
  GET DIAGNOSTICS moved_players = ROW_COUNT;

  RAISE NOTICE 'P08.1: % unclaimed players moved onto % club records', moved_players, unlinked_records;
  DROP TABLE rotra_p08_unclaimed;
END
$$;

COMMIT;
