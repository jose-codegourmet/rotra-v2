-- P13.6 (#915). Existing players use the automatic checks until an owner sets an override.
BEGIN;

CREATE TYPE "player_verification_override" AS ENUM ('verified');

ALTER TABLE "players"
  ADD COLUMN "verification_override" "player_verification_override",
  ADD COLUMN "verification_override_by" UUID,
  ADD COLUMN "verification_override_at" TIMESTAMPTZ(6),
  ADD CONSTRAINT "players_verification_override_by_fkey"
    FOREIGN KEY ("verification_override_by") REFERENCES "admin_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "players_verification_override_check" CHECK (
    ("verification_override" IS NULL AND "verification_override_by" IS NULL AND "verification_override_at" IS NULL)
    OR ("verification_override" IS NOT NULL AND "verification_override_by" IS NOT NULL
        AND "verification_override_at" IS NOT NULL AND "profile_state" = 'claimed')
  );

CREATE INDEX "players_verification_override_by_idx" ON "players"("verification_override_by");

COMMIT;
