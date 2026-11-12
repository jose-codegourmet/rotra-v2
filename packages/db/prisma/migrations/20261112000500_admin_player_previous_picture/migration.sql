-- Keep the prior picture when Admin changes a player profile. Existing profiles start without one.
ALTER TABLE "players" ADD COLUMN "avatar_previous_ref" TEXT;

ALTER TABLE "player_contact_change_requests" ADD COLUMN "superseded_at" TIMESTAMPTZ;
-- Email updates cross the Auth provider and Postgres; keep a private recovery record.
CREATE TABLE "admin_player_email_edits" (
  "id" UUID PRIMARY KEY,
  "player_id" UUID NOT NULL REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "admin_id" UUID NOT NULL REFERENCES "admin_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "original_email" TEXT,
  "proposed_email" TEXT NOT NULL,
  "contact_revision" BIGINT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'pending' CHECK ("state" IN ('pending', 'applied', 'failed')),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL
);
CREATE INDEX "admin_player_email_edits_player_id_created_at_idx" ON "admin_player_email_edits" ("player_id", "created_at" DESC);
CREATE UNIQUE INDEX "admin_player_email_edits_one_pending" ON "admin_player_email_edits" ("player_id") WHERE "state" = 'pending';
CREATE UNIQUE INDEX "admin_player_email_edits_reserved_email" ON "admin_player_email_edits" ("proposed_email") WHERE "state" = 'pending';
ALTER TABLE "admin_player_email_edits" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "admin_player_email_edits" FROM anon, authenticated;
-- Serialize reservations against contact writes, including registrations in other transactions.
CREATE FUNCTION "admin_email_reservation_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE candidate TEXT; subject UUID;
BEGIN
  IF TG_TABLE_NAME = 'admin_player_email_edits' THEN
    IF NEW."state" <> 'pending' THEN RETURN NEW; END IF;
    candidate := NEW."proposed_email"; subject := NEW."player_id";
  ELSE
    candidate := NEW."email"; subject := NEW."player_id";
    IF candidate IS NULL THEN RETURN NEW; END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('rotra-admin-email:' || lower(candidate), 0));
  IF TG_TABLE_NAME = 'admin_player_email_edits' THEN
    IF EXISTS (SELECT 1 FROM "player_private_contacts" WHERE "email" = candidate AND "player_id" <> subject)
      OR EXISTS (SELECT 1 FROM "player_contact_change_requests" WHERE "field" = 'email' AND "proposed_value" = candidate AND "status" IN ('approved', 'applying', 'failed') AND "player_id" <> subject)
    THEN RAISE EXCEPTION 'email already reserved' USING ERRCODE = 'unique_violation'; END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM "admin_player_email_edits" WHERE "proposed_email" = candidate AND "state" = 'pending' AND "player_id" <> subject)
    THEN RAISE EXCEPTION 'email already reserved' USING ERRCODE = 'unique_violation'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "admin_email_edit_reservation_guard" BEFORE INSERT OR UPDATE OF "proposed_email", "state" ON "admin_player_email_edits" FOR EACH ROW EXECUTE FUNCTION "admin_email_reservation_guard"();
CREATE TRIGGER "player_contact_email_reservation_guard" BEFORE INSERT OR UPDATE OF "email" ON "player_private_contacts" FOR EACH ROW EXECUTE FUNCTION "admin_email_reservation_guard"();
REVOKE ALL ON FUNCTION "admin_email_reservation_guard"() FROM PUBLIC;
