-- F07.11 · player identity, private contacts, claims and RTR allocation (#252)
-- DRAFT for review. Generated with `prisma migrate diff`, plus hand-written CHECKs, partial uniques,
-- immutability triggers and the atomic sequence function. Not applied; needs sign-off.
-- Open: phone acceptance/country rules, email canonicalization, claim lifetime/reissue,
-- sync-day timezone, sequence overflow above 9999 (#244).

-- CreateEnum
CREATE TYPE "player_profile_state" AS ENUM ('unclaimed', 'claimed');

-- CreateEnum
CREATE TYPE "player_contact_sync_status" AS ENUM ('in_sync', 'applying', 'failed');

-- CreateEnum
CREATE TYPE "social_provider" AS ENUM ('facebook', 'instagram', 'youtube', 'linkedin');

-- CreateEnum
CREATE TYPE "player_claim_link_state" AS ENUM ('active', 'consumed', 'revoked');

-- CreateTable
CREATE TABLE "player_id_counters" (
    "location_code_id" UUID NOT NULL,
    "sync_date" DATE NOT NULL,
    "last_sequence" INTEGER NOT NULL,

    CONSTRAINT "player_id_counters_pkey" PRIMARY KEY ("location_code_id","sync_date")
);

-- CreateTable
CREATE TABLE "player_id_allocations" (
    "player_id" UUID NOT NULL,
    "rtr_id" TEXT NOT NULL,
    "creating_club_id" UUID NOT NULL,
    "location_code_id" UUID NOT NULL,
    "country_code" TEXT NOT NULL,
    "city_code" TEXT NOT NULL,
    "sync_date" DATE NOT NULL,
    "sequence" INTEGER NOT NULL,
    "allocated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_id_allocations_pkey" PRIMARY KEY ("player_id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "nickname" TEXT,
    "avatar_ref" TEXT,
    "profile_state" "player_profile_state" NOT NULL DEFAULT 'unclaimed',
    "hide_phone_from_clubs" BOOLEAN NOT NULL DEFAULT false,
    "experience_months" INTEGER,
    "experience_recorded_at" TIMESTAMPTZ(6),
    "personal_details" JSONB,
    "details_version" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_private_contacts" (
    "player_id" UUID NOT NULL,
    "phone_e164" TEXT NOT NULL,
    "email" TEXT,
    "phone_verified_at" TIMESTAMPTZ(6),
    "email_verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "player_private_contacts_pkey" PRIMARY KEY ("player_id")
);

-- CreateTable
CREATE TABLE "player_accounts" (
    "player_id" UUID NOT NULL,
    "auth_provider" TEXT NOT NULL,
    "auth_subject" UUID NOT NULL,
    "claimed_at" TIMESTAMPTZ(6) NOT NULL,
    "contact_sync_version" BIGINT NOT NULL,
    "contact_sync_status" "player_contact_sync_status" NOT NULL DEFAULT 'in_sync',
    "disabled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "player_accounts_pkey" PRIMARY KEY ("player_id")
);

-- CreateTable
CREATE TABLE "player_social_links" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "provider" "social_provider" NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "player_social_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_claim_links" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "issuing_club_id" UUID NOT NULL,
    "token_digest" BYTEA NOT NULL,
    "state" "player_claim_link_state" NOT NULL DEFAULT 'active',
    "issued_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "player_claim_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "player_id_allocations_rtr_id_key" ON "player_id_allocations"("rtr_id");

-- CreateIndex
CREATE INDEX "player_id_allocations_creating_club_id_idx" ON "player_id_allocations"("creating_club_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_id_allocations_location_code_id_sync_date_sequence_key" ON "player_id_allocations"("location_code_id", "sync_date", "sequence");

-- CreateIndex
CREATE INDEX "players_full_name_idx" ON "players"("full_name");

-- CreateIndex
CREATE UNIQUE INDEX "player_private_contacts_phone_e164_key" ON "player_private_contacts"("phone_e164");

-- CreateIndex
CREATE UNIQUE INDEX "player_private_contacts_email_key" ON "player_private_contacts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "player_accounts_auth_provider_auth_subject_key" ON "player_accounts"("auth_provider", "auth_subject");

-- CreateIndex
CREATE UNIQUE INDEX "player_social_links_player_id_provider_key" ON "player_social_links"("player_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "player_claim_links_token_digest_key" ON "player_claim_links"("token_digest");

-- CreateIndex
CREATE INDEX "player_claim_links_player_id_issued_at_idx" ON "player_claim_links"("player_id", "issued_at" DESC);

-- CreateIndex
CREATE INDEX "player_claim_links_issuing_club_id_issued_at_idx" ON "player_claim_links"("issuing_club_id", "issued_at" DESC);

-- AddForeignKey
ALTER TABLE "player_id_counters" ADD CONSTRAINT "player_id_counters_location_code_id_fkey" FOREIGN KEY ("location_code_id") REFERENCES "location_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_id_allocations" ADD CONSTRAINT "player_id_allocations_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_id_allocations" ADD CONSTRAINT "player_id_allocations_creating_club_id_fkey" FOREIGN KEY ("creating_club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_id_allocations" ADD CONSTRAINT "player_id_allocations_location_code_id_fkey" FOREIGN KEY ("location_code_id") REFERENCES "location_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_id_allocations" ADD CONSTRAINT "player_id_allocations_location_code_id_sync_date_fkey" FOREIGN KEY ("location_code_id", "sync_date") REFERENCES "player_id_counters"("location_code_id", "sync_date") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_private_contacts" ADD CONSTRAINT "player_private_contacts_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_accounts" ADD CONSTRAINT "player_accounts_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_social_links" ADD CONSTRAINT "player_social_links_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_claim_links" ADD CONSTRAINT "player_claim_links_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_claim_links" ADD CONSTRAINT "player_claim_links_issuing_club_id_fkey" FOREIGN KEY ("issuing_club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- players
ALTER TABLE "players"
  ADD CONSTRAINT "players_full_name_check" CHECK (length(btrim("full_name")) > 0),
  ADD CONSTRAINT "players_experience_months_check" CHECK ("experience_months" IS NULL OR "experience_months" >= 0),
  ADD CONSTRAINT "players_experience_recorded_check" CHECK (("experience_months" IS NULL) = ("experience_recorded_at" IS NULL)),
  ADD CONSTRAINT "players_details_version_check" CHECK (("personal_details" IS NULL) OR ("details_version" IS NOT NULL AND "details_version" > 0));

-- player_private_contacts: normalized identifiers only.
ALTER TABLE "player_private_contacts"
  ADD CONSTRAINT "player_private_contacts_phone_check" CHECK ("phone_e164" ~ '^\+[1-9][0-9]{7,14}$'),
  ADD CONSTRAINT "player_private_contacts_email_check" CHECK (
    "email" IS NULL OR ("email" = lower(btrim("email")) AND "email" ~ '^[^@\s]+@[^@\s]+$')
  );

-- player_accounts: a claimed profile needs both contacts. Checked at commit so the claim command
-- can write the contact and the account in one transaction in either order.
CREATE FUNCTION "player_accounts_require_contacts"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "player_private_contacts" c
    WHERE c."player_id" = NEW."player_id" AND c."email" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'player % has no phone and email for a claimed account', NEW."player_id"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER "player_accounts_require_contacts"
  AFTER INSERT OR UPDATE ON "player_accounts"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "player_accounts_require_contacts"();

-- player_social_links
ALTER TABLE "player_social_links"
  ADD CONSTRAINT "player_social_links_url_check" CHECK ("url" ~ '^https://');

-- player_claim_links: state evidence, expiry after issue, one active link per player.
ALTER TABLE "player_claim_links"
  ADD CONSTRAINT "player_claim_links_digest_check" CHECK (octet_length("token_digest") = 32),
  ADD CONSTRAINT "player_claim_links_expiry_check" CHECK ("expires_at" > "issued_at"),
  ADD CONSTRAINT "player_claim_links_state_check" CHECK (
    ("state" = 'active' AND "consumed_at" IS NULL AND "revoked_at" IS NULL)
    OR ("state" = 'consumed' AND "consumed_at" IS NOT NULL AND "revoked_at" IS NULL)
    OR ("state" = 'revoked' AND "revoked_at" IS NOT NULL AND "consumed_at" IS NULL)
  );
CREATE UNIQUE INDEX "player_claim_links_one_active_per_player"
  ON "player_claim_links" ("player_id") WHERE "state" = 'active';

-- player_id_counters / player_id_allocations
ALTER TABLE "player_id_counters"
  ADD CONSTRAINT "player_id_counters_last_sequence_check" CHECK ("last_sequence" > 0);

ALTER TABLE "player_id_allocations"
  ADD CONSTRAINT "player_id_allocations_sequence_check" CHECK ("sequence" > 0),
  ADD CONSTRAINT "player_id_allocations_codes_check" CHECK ("country_code" ~ '^[A-Z]{2}$' AND "city_code" ~ '^[A-Z]{3}$'),
  -- Four digits minimum; presentation above 9999 is open (#244), so wider sequences are not truncated.
  ADD CONSTRAINT "player_id_allocations_rtr_id_check" CHECK (
    "rtr_id" ~ '^RTR-[A-Z]{2}-[A-Z]{3}-[0-9]{6}-[0-9]{4,}$'
    AND "rtr_id" LIKE ('RTR-' || "country_code" || '-' || "city_code" || '-%')
  );
CREATE TRIGGER "player_id_allocations_append_only"
  BEFORE UPDATE OR DELETE ON "player_id_allocations"
  FOR EACH ROW EXECUTE FUNCTION "rotra_reject_mutation"();

-- The only way to advance a counter: one atomic upsert, never MAX(sequence) + 1.
-- Call inside the allocation transaction; a losing uniqueness race retries from identity resolution.
CREATE FUNCTION "rotra_next_player_sequence"(p_location_code_id uuid, p_sync_date date)
RETURNS integer LANGUAGE sql AS $$
  INSERT INTO "player_id_counters" ("location_code_id", "sync_date", "last_sequence")
  VALUES (p_location_code_id, p_sync_date, 1)
  ON CONFLICT ("location_code_id", "sync_date")
  DO UPDATE SET "last_sequence" = "player_id_counters"."last_sequence" + 1
  RETURNING "last_sequence";
$$;

REVOKE ALL ON "players", "player_private_contacts", "player_accounts", "player_social_links",
  "player_claim_links", "player_id_counters", "player_id_allocations" FROM anon, authenticated;
REVOKE ALL ON FUNCTION "player_accounts_require_contacts"(),
  "rotra_next_player_sequence"(uuid, date) FROM PUBLIC;
