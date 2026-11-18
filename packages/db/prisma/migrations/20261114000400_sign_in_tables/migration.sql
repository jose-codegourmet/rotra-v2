-- go-sign-in 1.1 (B-62, B-36). Additive only: four new Go-owned tables, nothing altered or dropped.
-- Apply to a shared database only after human sign-off (staging, then Supabase production).
-- Prisma cannot express UNLOGGED, GENERATED ALWAYS identity, fillfactor, CHECKs, partial indexes or
-- triggers, so those are hand-written below the generated shape.

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "audience" TEXT NOT NULL,
    "login_key" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "password_scheme" TEXT NOT NULL,
    "password_changed_at" TIMESTAMPTZ(6) NOT NULL,
    "disabled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable (fillfactor leaves room for HOT updates of last_seen_at, last_ip and the digests)
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "identity_id" UUID NOT NULL,
    "audience" TEXT NOT NULL,
    "club_id" UUID,
    "device_id" UUID,
    "device_label" TEXT NOT NULL,
    "refresh_digest" BYTEA NOT NULL,
    "previous_refresh_digest" BYTEA,
    "refreshed_at" TIMESTAMPTZ(6),
    "created_ip" INET,
    "last_ip" INET,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "revoke_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
) WITH (fillfactor = 90);

-- CreateTable (UNLOGGED: counters are cheap to lose in a crash; no WAL cost, no Redis)
CREATE UNLOGGED TABLE "auth_rate_limits" (
    "scope" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "window_start" TIMESTAMPTZ(6) NOT NULL,
    "attempts" INTEGER NOT NULL,

    CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY ("scope","subject","action","window_start")
);

-- CreateTable (Prisma writes BIGSERIAL; the design asks for GENERATED ALWAYS AS IDENTITY, set below)
CREATE TABLE "auth_events" (
    "id" BIGSERIAL NOT NULL,
    "identity_id" UUID,
    "session_id" UUID,
    "audience" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "ip" INET,
    "device_id" UUID,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_audience_login_key_key" ON "auth_identities"("audience", "login_key");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refresh_digest_key" ON "auth_sessions"("refresh_digest");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_previous_refresh_digest_key" ON "auth_sessions"("previous_refresh_digest");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "auth_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (a device from another club cannot be attached; MATCH SIMPLE skips it when device_id is null)
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_club_id_device_id_fkey" FOREIGN KEY ("club_id", "device_id") REFERENCES "devices"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_events" ADD CONSTRAINT "auth_events_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "auth_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_events" ADD CONSTRAINT "auth_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written from here: identity column, CHECKs, partial indexes, append-only trigger, lockdown.

-- Ids are app-generated UUIDv7 (Postgres 17 has no uuidv7()), so the uuid keys have no default.
ALTER TABLE "auth_events" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "auth_events_id_seq";
ALTER TABLE "auth_events" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (SEQUENCE NAME "auth_events_id_seq");

ALTER TABLE "auth_identities"
  ADD CONSTRAINT "auth_identities_audience_check" CHECK ("audience" IN ('club', 'player', 'admin')),
  ADD CONSTRAINT "auth_identities_login_key_check" CHECK ("login_key" = lower(btrim("login_key")) AND "login_key" <> ''),
  ADD CONSTRAINT "auth_identities_password_scheme_check" CHECK ("password_scheme" IN ('argon2id', 'bcrypt'));

ALTER TABLE "auth_sessions"
  ADD CONSTRAINT "auth_sessions_audience_check" CHECK ("audience" IN ('club', 'player', 'admin')),
  ADD CONSTRAINT "auth_sessions_device_label_check" CHECK ("device_label" <> ''),
  ADD CONSTRAINT "auth_sessions_refresh_digest_len" CHECK (octet_length("refresh_digest") = 32),
  ADD CONSTRAINT "auth_sessions_previous_refresh_digest_len" CHECK (octet_length("previous_refresh_digest") = 32),
  ADD CONSTRAINT "auth_sessions_revoke_reason_check" CHECK ("revoke_reason" IN (
    'sign_out', 'signed_out_by_owner', 'signed_out_by_admin', 'password_changed', 'account_disabled',
    'device_revoked', 'refresh_reused', 'expired')),
  ADD CONSTRAINT "auth_sessions_revoked_pair" CHECK (("revoked_at" IS NULL) = ("revoke_reason" IS NULL)),
  ADD CONSTRAINT "auth_sessions_club_scope" CHECK (("audience" = 'club') = ("club_id" IS NOT NULL)),
  ADD CONSTRAINT "auth_sessions_device_club_only" CHECK ("device_id" IS NULL OR "audience" = 'club');

CREATE INDEX "auth_sessions_identity_active" ON "auth_sessions" ("identity_id", "last_seen_at" DESC)
  WHERE "revoked_at" IS NULL;
CREATE INDEX "auth_sessions_device" ON "auth_sessions" ("club_id", "device_id")
  WHERE "device_id" IS NOT NULL;

ALTER TABLE "auth_rate_limits"
  ADD CONSTRAINT "auth_rate_limits_scope_check" CHECK ("scope" IN ('ip', 'login', 'device')),
  ADD CONSTRAINT "auth_rate_limits_action_check" CHECK ("action" IN ('sign_in', 'reset_request', 'claim', 'refresh')),
  ADD CONSTRAINT "auth_rate_limits_attempts_check" CHECK ("attempts" > 0);

ALTER TABLE "auth_events"
  ADD CONSTRAINT "auth_events_audience_check" CHECK ("audience" IN ('club', 'player', 'admin')),
  ADD CONSTRAINT "auth_events_event_check" CHECK ("event" IN (
    'sign_in', 'sign_in_failed', 'rate_limited', 'refresh_reused', 'sign_out', 'session_revoked',
    'password_changed', 'password_reset_issued', 'password_reset_used', 'device_enrolled', 'device_revoked'));

CREATE INDEX "auth_events_identity" ON "auth_events" ("identity_id", "occurred_at" DESC)
  WHERE "identity_id" IS NOT NULL;
CREATE INDEX "auth_events_session" ON "auth_events" ("session_id") WHERE "session_id" IS NOT NULL;

-- auth_events is append-only. UPDATE is always refused. DELETE is refused unless the transaction set
-- `rotra.auth_events_retention` to 'on' (SET LOCAL, or set_config(..., true)): the API's hourly
-- housekeeping loop does this, in a transaction, for rows past the retention window (B-34).
CREATE FUNCTION "rotra_auth_events_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND coalesce(current_setting('rotra.auth_events_retention', true), '') = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'restrict_violation';
END;
$$;
CREATE TRIGGER "auth_events_append_only"
  BEFORE UPDATE OR DELETE ON "auth_events"
  FOR EACH ROW EXECUTE FUNCTION "rotra_auth_events_guard"();

-- Go-only tables: the data API roles never see them (the one-time loop in 20261102000100 covers earlier tables only).
ALTER TABLE "auth_identities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth_rate_limits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "auth_identities" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE "auth_sessions" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE "auth_rate_limits" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE "auth_events" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON SEQUENCE "auth_events_id_seq" FROM anon, authenticated, PUBLIC;
