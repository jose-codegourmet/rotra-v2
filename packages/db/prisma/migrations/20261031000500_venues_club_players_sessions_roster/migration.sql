-- F07.13 · venues, club players, Queue Sessions and roster assessments (#254)
-- DRAFT for review. Generated with `prisma migrate diff`, plus hand-written CHECKs, partial and
-- expression uniques, the no-overlap exclusion constraint and the level-lock trigger.
-- Not applied; needs sign-off. Needs the btree_gist extension on the target.
-- Open: roster/waitlist identity and ordering, missing-level states (#245); assessment eligibility
-- (#247); join-request visitor ownership (#248); offline reservation rules (#246).

-- CreateEnum
CREATE TYPE "club_player_input_state" AS ENUM ('pending', 'resolved', 'conflicted', 'discarded');

-- CreateEnum
CREATE TYPE "roster_release_reason" AS ENUM ('demoted', 'removed');

-- CreateEnum
CREATE TYPE "stated_band" AS ENUM ('beginner', 'intermediate', 'advanced', 'unsure');

-- CreateEnum
CREATE TYPE "join_request_status" AS ENUM ('pending', 'confirmed', 'declined');

-- CreateEnum
CREATE TYPE "queue_session_state" AS ENUM ('prepared', 'active', 'finalizing', 'completed', 'invalid');

-- CreateEnum
CREATE TYPE "session_mode" AS ENUM ('chill', 'fair', 'hard');

-- CreateTable
CREATE TABLE "club_assessments" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "club_player_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "session_player_id" UUID NOT NULL,
    "player_id_at_assessment" UUID,
    "skill_level_id" SMALLINT NOT NULL,
    "supersedes_id" UUID,
    "source_operation_id" UUID NOT NULL,
    "assessed_at" TIMESTAMPTZ(6) NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_revision" BIGINT NOT NULL,
    "actor_club_id" UUID NOT NULL,
    "device_id" UUID,

    CONSTRAINT "club_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_players" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "player_id" UUID,
    "display_name" TEXT NOT NULL,
    "nickname" TEXT,
    "added_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "club_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_player_private_inputs" (
    "club_player_id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "phone_e164" TEXT,
    "email" TEXT,
    "preset_fields" JSONB,
    "captured_at" TIMESTAMPTZ(6) NOT NULL,
    "state" "club_player_input_state" NOT NULL DEFAULT 'pending',
    "resolved_player_id" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "club_player_private_inputs_pkey" PRIMARY KEY ("club_player_id")
);

-- CreateTable
CREATE TABLE "club_venues" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "court_fee_per_court_hour_minor" INTEGER,
    "entrance_fee_minor" INTEGER,
    "currency" CHAR(3) NOT NULL DEFAULT 'PHP',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "club_venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_players" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "club_player_id" UUID NOT NULL,
    "player_id_at_entry" UUID,
    "name_snapshot" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT false,
    "present_changed_at" TIMESTAMPTZ(6) NOT NULL,
    "assessment_id" UUID,
    "skill_level_id" SMALLINT,
    "level_locked_at" TIMESTAMPTZ(6),
    "confirmed_at" TIMESTAMPTZ(6) NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL,
    "over_budget_at" TIMESTAMPTZ(6),
    "released_at" TIMESTAMPTZ(6),
    "release_reason" "roster_release_reason",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "session_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_waitlist" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "club_player_id" UUID NOT NULL,
    "skill_level_id" SMALLINT,
    "added_at" TIMESTAMPTZ(6) NOT NULL,
    "demoted_at" TIMESTAMPTZ(6),
    "demoted_confirmed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "session_waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_join_requests" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "phone_e164" TEXT,
    "stated_band" "stated_band" NOT NULL,
    "status" "join_request_status" NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMPTZ(6) NOT NULL,
    "decided_at" TIMESTAMPTZ(6),
    "decided_by_device_id" UUID,
    "club_player_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "session_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_sessions" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "scheduled_start_at" TIMESTAMPTZ(6) NOT NULL,
    "scheduled_end_at" TIMESTAMPTZ(6) NOT NULL,
    "venue_id" UUID,
    "venue_name" TEXT,
    "venue_address" TEXT,
    "state" "queue_session_state" NOT NULL DEFAULT 'prepared',
    "invalid_reason" TEXT,
    "session_mode" "session_mode" NOT NULL DEFAULT 'fair',
    "allow_singles" BOOLEAN NOT NULL DEFAULT true,
    "allow_doubles" BOOLEAN NOT NULL DEFAULT true,
    "minimum_games" INTEGER NOT NULL DEFAULT 0,
    "minimum_is_calculated" BOOLEAN NOT NULL DEFAULT true,
    "players_per_court" SMALLINT NOT NULL,
    "expected_players" INTEGER,
    "queue_revision" BIGINT NOT NULL DEFAULT 1,
    "started_at" TIMESTAMPTZ(6),
    "finalized_at" TIMESTAMPTZ(6),
    "series_id" UUID,
    "start_license_term_id" UUID,
    "public_slug" TEXT NOT NULL,
    "accept_join_requests" BOOLEAN NOT NULL DEFAULT true,
    "source_command_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "queue_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_session_reservations" (
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "acquired_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_session_reservations_pkey" PRIMARY KEY ("club_id")
);

-- CreateTable
CREATE TABLE "session_courts" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "open_until" TIMESTAMPTZ(6),
    "removed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "session_courts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "club_assessments_source_operation_id_key" ON "club_assessments"("source_operation_id");

-- CreateIndex
CREATE INDEX "club_assessments_player_id_at_assessment_club_id_assessed_a_idx" ON "club_assessments"("player_id_at_assessment", "club_id", "assessed_at" DESC, "accepted_revision" DESC);

-- CreateIndex
CREATE INDEX "club_assessments_club_id_club_player_id_assessed_at_idx" ON "club_assessments"("club_id", "club_player_id", "assessed_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "club_assessments_club_id_club_player_id_id_key" ON "club_assessments"("club_id", "club_player_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "club_assessments_club_id_session_id_session_player_id_id_key" ON "club_assessments"("club_id", "session_id", "session_player_id", "id");

-- CreateIndex
CREATE INDEX "club_players_club_id_display_name_id_idx" ON "club_players"("club_id", "display_name", "id");

-- CreateIndex
CREATE INDEX "club_players_player_id_idx" ON "club_players"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_players_club_id_id_key" ON "club_players"("club_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "club_players_club_id_player_id_key" ON "club_players"("club_id", "player_id");

-- CreateIndex
CREATE INDEX "club_player_private_inputs_state_captured_at_idx" ON "club_player_private_inputs"("state", "captured_at");

-- CreateIndex
CREATE INDEX "club_player_private_inputs_phone_e164_idx" ON "club_player_private_inputs"("phone_e164");

-- CreateIndex
CREATE INDEX "club_player_private_inputs_resolved_player_id_idx" ON "club_player_private_inputs"("resolved_player_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_player_private_inputs_club_id_club_player_id_key" ON "club_player_private_inputs"("club_id", "club_player_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_venues_club_id_id_key" ON "club_venues"("club_id", "id");

-- CreateIndex
CREATE INDEX "session_players_session_id_present_id_idx" ON "session_players"("session_id", "present", "id");

-- CreateIndex
CREATE INDEX "session_players_club_id_club_player_id_idx" ON "session_players"("club_id", "club_player_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_players_club_id_session_id_id_key" ON "session_players"("club_id", "session_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "session_players_session_id_club_player_id_key" ON "session_players"("session_id", "club_player_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_players_session_id_player_id_at_entry_key" ON "session_players"("session_id", "player_id_at_entry");

-- CreateIndex
CREATE INDEX "session_waitlist_session_id_demoted_at_demoted_confirmed_at_idx" ON "session_waitlist"("session_id", "demoted_at" DESC, "demoted_confirmed_at", "added_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "session_waitlist_session_id_club_player_id_key" ON "session_waitlist"("session_id", "club_player_id");

-- CreateIndex
CREATE INDEX "session_join_requests_session_id_status_requested_at_idx" ON "session_join_requests"("session_id", "status", "requested_at");

-- CreateIndex
CREATE UNIQUE INDEX "queue_sessions_public_slug_key" ON "queue_sessions"("public_slug");

-- CreateIndex
CREATE UNIQUE INDEX "queue_sessions_source_command_id_key" ON "queue_sessions"("source_command_id");

-- CreateIndex
CREATE INDEX "queue_sessions_club_id_scheduled_start_at_id_idx" ON "queue_sessions"("club_id", "scheduled_start_at" DESC, "id");

-- CreateIndex
CREATE INDEX "queue_sessions_club_id_series_id_idx" ON "queue_sessions"("club_id", "series_id");

-- CreateIndex
CREATE UNIQUE INDEX "queue_sessions_club_id_id_key" ON "queue_sessions"("club_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "club_session_reservations_session_id_key" ON "club_session_reservations"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_session_reservations_club_id_session_id_key" ON "club_session_reservations"("club_id", "session_id");

-- CreateIndex
CREATE INDEX "session_courts_session_id_idx" ON "session_courts"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_courts_club_id_session_id_id_key" ON "session_courts"("club_id", "session_id", "id");

-- AddForeignKey
ALTER TABLE "club_assessments" ADD CONSTRAINT "club_assessments_club_id_club_player_id_fkey" FOREIGN KEY ("club_id", "club_player_id") REFERENCES "club_players"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_assessments" ADD CONSTRAINT "club_assessments_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "queue_sessions"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_assessments" ADD CONSTRAINT "club_assessments_club_id_session_id_session_player_id_fkey" FOREIGN KEY ("club_id", "session_id", "session_player_id") REFERENCES "session_players"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_assessments" ADD CONSTRAINT "club_assessments_player_id_at_assessment_fkey" FOREIGN KEY ("player_id_at_assessment") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_assessments" ADD CONSTRAINT "club_assessments_skill_level_id_fkey" FOREIGN KEY ("skill_level_id") REFERENCES "skill_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_assessments" ADD CONSTRAINT "club_assessments_club_id_club_player_id_supersedes_id_fkey" FOREIGN KEY ("club_id", "club_player_id", "supersedes_id") REFERENCES "club_assessments"("club_id", "club_player_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_players" ADD CONSTRAINT "club_players_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_players" ADD CONSTRAINT "club_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_player_private_inputs" ADD CONSTRAINT "club_player_private_inputs_club_id_club_player_id_fkey" FOREIGN KEY ("club_id", "club_player_id") REFERENCES "club_players"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_player_private_inputs" ADD CONSTRAINT "club_player_private_inputs_resolved_player_id_fkey" FOREIGN KEY ("resolved_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_venues" ADD CONSTRAINT "club_venues_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_players" ADD CONSTRAINT "session_players_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "queue_sessions"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_players" ADD CONSTRAINT "session_players_club_id_club_player_id_fkey" FOREIGN KEY ("club_id", "club_player_id") REFERENCES "club_players"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_players" ADD CONSTRAINT "session_players_player_id_at_entry_fkey" FOREIGN KEY ("player_id_at_entry") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_players" ADD CONSTRAINT "session_players_skill_level_id_fkey" FOREIGN KEY ("skill_level_id") REFERENCES "skill_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_players" ADD CONSTRAINT "session_players_club_id_session_id_id_assessment_id_fkey" FOREIGN KEY ("club_id", "session_id", "id", "assessment_id") REFERENCES "club_assessments"("club_id", "session_id", "session_player_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_waitlist" ADD CONSTRAINT "session_waitlist_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "queue_sessions"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_waitlist" ADD CONSTRAINT "session_waitlist_club_id_club_player_id_fkey" FOREIGN KEY ("club_id", "club_player_id") REFERENCES "club_players"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_waitlist" ADD CONSTRAINT "session_waitlist_skill_level_id_fkey" FOREIGN KEY ("skill_level_id") REFERENCES "skill_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_join_requests" ADD CONSTRAINT "session_join_requests_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "queue_sessions"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_join_requests" ADD CONSTRAINT "session_join_requests_club_id_club_player_id_fkey" FOREIGN KEY ("club_id", "club_player_id") REFERENCES "club_players"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_sessions" ADD CONSTRAINT "queue_sessions_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_sessions" ADD CONSTRAINT "queue_sessions_club_id_venue_id_fkey" FOREIGN KEY ("club_id", "venue_id") REFERENCES "club_venues"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_sessions" ADD CONSTRAINT "queue_sessions_club_id_start_license_term_id_fkey" FOREIGN KEY ("club_id", "start_license_term_id") REFERENCES "club_license_terms"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_session_reservations" ADD CONSTRAINT "club_session_reservations_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_session_reservations" ADD CONSTRAINT "club_session_reservations_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "queue_sessions"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_courts" ADD CONSTRAINT "session_courts_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "queue_sessions"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- club_players / private intake
ALTER TABLE "club_players"
  ADD CONSTRAINT "club_players_display_name_check" CHECK (length(btrim("display_name")) > 0);

ALTER TABLE "club_player_private_inputs"
  ADD CONSTRAINT "club_player_private_inputs_phone_check" CHECK ("phone_e164" IS NULL OR "phone_e164" ~ '^\+[1-9][0-9]{7,14}$'),
  ADD CONSTRAINT "club_player_private_inputs_email_check" CHECK ("email" IS NULL OR "email" = lower(btrim("email"))),
  ADD CONSTRAINT "club_player_private_inputs_resolved_check" CHECK (
    ("state" = 'resolved') = ("resolved_player_id" IS NOT NULL AND "resolved_at" IS NOT NULL)
  );

-- club_venues: unique name per club, case-insensitive; fees are null or ≥ 0.
ALTER TABLE "club_venues"
  ADD CONSTRAINT "club_venues_name_check" CHECK (length(btrim("name")) > 0),
  ADD CONSTRAINT "club_venues_fees_check" CHECK (
    ("court_fee_per_court_hour_minor" IS NULL OR "court_fee_per_court_hour_minor" >= 0)
    AND ("entrance_fee_minor" IS NULL OR "entrance_fee_minor" >= 0)
  ),
  ADD CONSTRAINT "club_venues_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$');
CREATE UNIQUE INDEX "club_venues_club_id_lower_name_key" ON "club_venues" ("club_id", lower("name"));

-- queue_sessions
ALTER TABLE "queue_sessions"
  ADD CONSTRAINT "queue_sessions_title_check" CHECK (length(btrim("title")) > 0),
  ADD CONSTRAINT "queue_sessions_schedule_check" CHECK ("scheduled_end_at" > "scheduled_start_at"),
  ADD CONSTRAINT "queue_sessions_minimum_games_check" CHECK ("minimum_games" >= 0),
  ADD CONSTRAINT "queue_sessions_players_per_court_check" CHECK ("players_per_court" BETWEEN 2 AND 20),
  ADD CONSTRAINT "queue_sessions_expected_players_check" CHECK ("expected_players" IS NULL OR "expected_players" > 0),
  ADD CONSTRAINT "queue_sessions_invalid_reason_check" CHECK ("state" <> 'invalid' OR length(btrim(coalesce("invalid_reason", ''))) > 0),
  ADD CONSTRAINT "queue_sessions_started_check" CHECK ("state" = 'prepared' OR "state" = 'invalid' OR "started_at" IS NOT NULL),
  ADD CONSTRAINT "queue_sessions_finalized_check" CHECK (("state" = 'completed') = ("finalized_at" IS NOT NULL)),
  ADD CONSTRAINT "queue_sessions_public_slug_check" CHECK ("public_slug" ~ '^[a-z0-9-]{4,64}$'),
  -- No overlapping non-invalid sessions in one club. Commands report which session clashes.
  ADD CONSTRAINT "queue_sessions_no_overlap" EXCLUDE USING gist (
    "club_id" WITH =,
    tstzrange("scheduled_start_at", "scheduled_end_at") WITH &&
  ) WHERE ("state" <> 'invalid');
-- One server-known active/finalizing session per club. Cannot stop two disconnected starts by itself.
CREATE UNIQUE INDEX "queue_sessions_one_running_per_club"
  ON "queue_sessions" ("club_id") WHERE "state" IN ('active', 'finalizing');

-- session_courts: one live label per session.
ALTER TABLE "session_courts"
  ADD CONSTRAINT "session_courts_label_check" CHECK (length(btrim("label")) > 0);
CREATE UNIQUE INDEX "session_courts_live_label_key"
  ON "session_courts" ("session_id", "label") WHERE "removed_at" IS NULL;

-- session_players: release evidence; locked entries carry a level and assessment.
ALTER TABLE "session_players"
  ADD CONSTRAINT "session_players_name_snapshot_check" CHECK (length(btrim("name_snapshot")) > 0),
  ADD CONSTRAINT "session_players_release_check" CHECK (("released_at" IS NULL) = ("release_reason" IS NULL)),
  ADD CONSTRAINT "session_players_locked_check" CHECK (
    "level_locked_at" IS NULL OR ("skill_level_id" IS NOT NULL AND "assessment_id" IS NOT NULL AND "released_at" IS NULL)
  ),
  ADD CONSTRAINT "session_players_level_pair_check" CHECK ("assessment_id" IS NULL OR "skill_level_id" IS NOT NULL);

-- After lock, the level and selected assessment never change, and the entry is never released.
CREATE FUNCTION "session_players_level_lock"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."level_locked_at" IS NOT NULL AND (
    NEW."skill_level_id" IS DISTINCT FROM OLD."skill_level_id"
    OR NEW."assessment_id" IS DISTINCT FROM OLD."assessment_id"
    OR NEW."level_locked_at" IS DISTINCT FROM OLD."level_locked_at"
    OR NEW."released_at" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'session player % has a locked level', OLD."id" USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "session_players_level_lock"
  BEFORE UPDATE ON "session_players"
  FOR EACH ROW EXECUTE FUNCTION "session_players_level_lock"();
-- Entries are released, never deleted.
CREATE TRIGGER "session_players_no_delete"
  BEFORE DELETE ON "session_players"
  FOR EACH ROW EXECUTE FUNCTION "rotra_reject_mutation"();

-- session_waitlist: demotion evidence comes as a pair.
ALTER TABLE "session_waitlist"
  ADD CONSTRAINT "session_waitlist_demotion_check" CHECK (("demoted_at" IS NULL) = ("demoted_confirmed_at" IS NULL));

-- session_join_requests
ALTER TABLE "session_join_requests"
  ADD CONSTRAINT "session_join_requests_name_check" CHECK (length(btrim("name")) > 0),
  ADD CONSTRAINT "session_join_requests_phone_check" CHECK ("phone_e164" IS NULL OR "phone_e164" ~ '^\+[1-9][0-9]{7,14}$'),
  ADD CONSTRAINT "session_join_requests_decision_check" CHECK (
    ("status" = 'pending') = ("decided_at" IS NULL)
    AND ("status" <> 'confirmed' OR "club_player_id" IS NOT NULL)
  );

-- club_assessments: append-only evidence.
ALTER TABLE "club_assessments"
  ADD CONSTRAINT "club_assessments_revision_check" CHECK ("accepted_revision" > 0),
  ADD CONSTRAINT "club_assessments_supersedes_check" CHECK ("supersedes_id" IS NULL OR "supersedes_id" <> "id"),
  ADD CONSTRAINT "club_assessments_actor_check" CHECK ("actor_club_id" = "club_id");
CREATE TRIGGER "club_assessments_append_only"
  BEFORE UPDATE OR DELETE ON "club_assessments"
  FOR EACH ROW EXECUTE FUNCTION "rotra_reject_mutation"();

REVOKE ALL ON "club_players", "club_player_private_inputs", "club_venues", "queue_sessions",
  "club_session_reservations", "session_courts", "session_players", "session_waitlist",
  "session_join_requests", "club_assessments" FROM anon, authenticated;
REVOKE ALL ON FUNCTION "session_players_level_lock"() FROM PUBLIC;
