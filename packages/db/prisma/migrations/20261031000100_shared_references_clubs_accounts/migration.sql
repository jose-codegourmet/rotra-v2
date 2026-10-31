-- F07.9 · shared references, clubs and account mappings (#250)
-- DRAFT for review. Generated with `prisma migrate diff`, plus hand-written CHECKs and seed rows
-- Prisma cannot express. Not applied anywhere; needs human sign-off (coding-conventions §13).
-- Open: club-name comparison and free-price nullability (#245); location registry (#244).

-- CreateEnum
CREATE TYPE "license_pricing" AS ENUM ('paid', 'free');

-- CreateEnum
CREATE TYPE "skill_category" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "skill_band" AS ENUM ('low', 'mid', 'high');

-- CreateTable
CREATE TABLE "admin_accounts" (
    "id" UUID NOT NULL,
    "auth_provider" TEXT NOT NULL,
    "auth_subject" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "admin_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_accounts" (
    "club_id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "auth_provider" TEXT NOT NULL,
    "auth_subject" UUID,
    "provisioned_at" TIMESTAMPTZ(6),
    "disabled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "club_accounts_pkey" PRIMARY KEY ("club_id")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "logo_ref" TEXT,
    "founding_location_code_id" UUID NOT NULL,
    "founding_address" TEXT NOT NULL,
    "license_pricing" "license_pricing" NOT NULL,
    "license_monthly_minor" INTEGER,
    "license_yearly_minor" INTEGER,
    "currency" CHAR(3) NOT NULL DEFAULT 'PHP',
    "default_players_per_court" SMALLINT NOT NULL DEFAULT 8,
    "default_entrance_fee_minor" INTEGER,
    "description" TEXT,
    "court_rules" TEXT,
    "post_template" TEXT,
    "source_command_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_codes" (
    "id" UUID NOT NULL,
    "country_code" TEXT NOT NULL,
    "city_code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "location_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_levels" (
    "id" SMALLINT NOT NULL,
    "code" TEXT NOT NULL,
    "category" "skill_category" NOT NULL,
    "band" "skill_band" NOT NULL,
    "display_order" SMALLINT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "skill_levels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_accounts_auth_provider_auth_subject_key" ON "admin_accounts"("auth_provider", "auth_subject");

-- CreateIndex
CREATE UNIQUE INDEX "club_accounts_username_key" ON "club_accounts"("username");

-- CreateIndex
CREATE UNIQUE INDEX "club_accounts_auth_provider_auth_subject_key" ON "club_accounts"("auth_provider", "auth_subject");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_name_key_key" ON "clubs"("name_key");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_source_command_id_key" ON "clubs"("source_command_id");

-- CreateIndex
CREATE INDEX "clubs_founding_location_code_id_idx" ON "clubs"("founding_location_code_id");

-- CreateIndex
CREATE UNIQUE INDEX "location_codes_country_code_city_code_key" ON "location_codes"("country_code", "city_code");

-- CreateIndex
CREATE UNIQUE INDEX "skill_levels_code_key" ON "skill_levels"("code");

-- CreateIndex
CREATE UNIQUE INDEX "skill_levels_display_order_key" ON "skill_levels"("display_order");

-- CreateIndex
CREATE UNIQUE INDEX "skill_levels_category_band_key" ON "skill_levels"("category", "band");

-- AddForeignKey
ALTER TABLE "club_accounts" ADD CONSTRAINT "club_accounts_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_founding_location_code_id_fkey" FOREIGN KEY ("founding_location_code_id") REFERENCES "location_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row-local checks (Prisma cannot express CHECK constraints)
ALTER TABLE "location_codes"
  ADD CONSTRAINT "location_codes_country_code_check" CHECK ("country_code" ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT "location_codes_city_code_check" CHECK ("city_code" ~ '^[A-Z]{3}$');

ALTER TABLE "skill_levels"
  ADD CONSTRAINT "skill_levels_display_order_check" CHECK ("display_order" BETWEEN 0 AND 8);

ALTER TABLE "clubs"
  ADD CONSTRAINT "clubs_name_check" CHECK (length(btrim("name")) > 0),
  ADD CONSTRAINT "clubs_name_key_check" CHECK (length("name_key") > 0),
  ADD CONSTRAINT "clubs_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "clubs_default_players_per_court_check" CHECK ("default_players_per_court" BETWEEN 2 AND 20),
  ADD CONSTRAINT "clubs_default_entrance_fee_minor_check" CHECK ("default_entrance_fee_minor" IS NULL OR "default_entrance_fee_minor" >= 0),
  -- Kept amounts are positive whenever present (free clubs may hold the last paid price or none).
  ADD CONSTRAINT "clubs_license_amounts_positive_check" CHECK (
    ("license_monthly_minor" IS NULL OR "license_monthly_minor" > 0)
    AND ("license_yearly_minor" IS NULL OR "license_yearly_minor" > 0)
  ),
  -- Paid clubs need both prices and the yearly discount: yearly < 12 × monthly.
  ADD CONSTRAINT "clubs_paid_price_check" CHECK (
    "license_pricing" <> 'paid'
    OR (
      "license_monthly_minor" IS NOT NULL
      AND "license_yearly_minor" IS NOT NULL
      AND "license_yearly_minor"::bigint < 12 * "license_monthly_minor"::bigint
    )
  );

ALTER TABLE "club_accounts"
  ADD CONSTRAINT "club_accounts_username_check" CHECK ("username" = lower(btrim("username")) AND length("username") > 0),
  ADD CONSTRAINT "club_accounts_provisioned_subject_check" CHECK ("provisioned_at" IS NULL OR "auth_subject" IS NOT NULL);

-- Reference data: exactly nine levels (decided 2026-10-26).
INSERT INTO "skill_levels" ("id", "code", "category", "band", "display_order", "label") VALUES
  (0, 'beginner_low', 'beginner', 'low', 0, 'Beginner Low'),
  (1, 'beginner_mid', 'beginner', 'mid', 1, 'Beginner Mid'),
  (2, 'beginner_high', 'beginner', 'high', 2, 'Beginner High'),
  (3, 'intermediate_low', 'intermediate', 'low', 3, 'Intermediate Low'),
  (4, 'intermediate_mid', 'intermediate', 'mid', 4, 'Intermediate Mid'),
  (5, 'intermediate_high', 'intermediate', 'high', 5, 'Intermediate High'),
  (6, 'advanced_low', 'advanced', 'low', 6, 'Advanced Low'),
  (7, 'advanced_mid', 'advanced', 'mid', 7, 'Advanced Mid'),
  (8, 'advanced_high', 'advanced', 'high', 8, 'Advanced High');

-- Application tables stay out of the Data API: no grants to anon/authenticated.
REVOKE ALL ON "location_codes", "skill_levels", "clubs", "club_accounts", "admin_accounts" FROM anon, authenticated;
