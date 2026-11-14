-- Admin picks the default profile banner (D-2026-11-13-03, P10.6 #820). Additive.

-- AlterTable
ALTER TABLE "profile_banners" ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false;


-- ---------------------------------------------------------------------------------------------
-- At most one default banner. The Admin server keeps the default shown and not deleted (hide and
-- delete of the default are refused there, like the 2-shown rule), and Make default clears the old
-- row and sets the new one in one transaction under the profile_banners advisory lock.
CREATE UNIQUE INDEX "profile_banners_one_default" ON "profile_banners" ("is_default") WHERE "is_default";

-- Court is the default at first (the seed default since 2026-11-12). Only while it is shown and not
-- deleted, so the server rule holds from the start; otherwise no row is marked and every read keeps
-- the old fallback (the first shown banner) until Admin picks one.
UPDATE "profile_banners" SET "is_default" = true
  WHERE "id" = 'court' AND "shown" AND "deleted_at" IS NULL;
