-- F07.17 · publications, publication events and private result exports (#258)
-- DRAFT for review. Generated with `prisma migrate diff`, plus hand-written output-boundary CHECKs,
-- the exact-cycle deletion guard and append-only triggers. Not applied to any shared database.
-- Open: withdrawal, restoration after deletion, internal retention (#248); storage and access.

-- CreateEnum
CREATE TYPE "publication_state" AS ENUM ('details', 'published', 'deleted');

-- CreateEnum
CREATE TYPE "result_slide" AS ENUM ('standings', 'awards');

-- CreateEnum
CREATE TYPE "export_format" AS ENUM ('story', 'feed');

-- CreateTable
CREATE TABLE "session_publications" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "public_key" TEXT NOT NULL,
    "state" "publication_state" NOT NULL DEFAULT 'details',
    "details_projection" JSONB NOT NULL,
    "participants_projection" JSONB NOT NULL,
    "published_snapshot_id" UUID,
    "published_slides" "result_slide"[],
    "include_off_day" BOOLEAN NOT NULL DEFAULT false,
    "public_results" JSONB,
    "published_at" TIMESTAMPTZ(6),
    "expiry_cycle_id" UUID,
    "last_synced_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "session_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_publication_events" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "slides" "result_slide"[],
    "include_off_day" BOOLEAN NOT NULL,
    "actor_club_id" UUID NOT NULL,
    "device_id" UUID,
    "source_command_id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_publication_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "result_exports" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "slides" "result_slide"[],
    "format" "export_format" NOT NULL,
    "include_off_day" BOOLEAN NOT NULL,
    "club_name_snapshot" TEXT NOT NULL,
    "club_logo_ref_snapshot" TEXT,
    "footer" TEXT NOT NULL DEFAULT 'powered by rotra',
    "frame_count" INTEGER NOT NULL,
    "asset_ref" TEXT,
    "source_command_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "result_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "session_publications_session_id_key" ON "session_publications"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_publications_public_key_key" ON "session_publications"("public_key");

-- CreateIndex
CREATE INDEX "session_publications_club_id_expiry_cycle_id_idx" ON "session_publications"("club_id", "expiry_cycle_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_publications_club_id_session_id_key" ON "session_publications"("club_id", "session_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_publications_club_id_session_id_id_key" ON "session_publications"("club_id", "session_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "session_publication_events_source_command_id_key" ON "session_publication_events"("source_command_id");

-- CreateIndex
CREATE INDEX "session_publication_events_publication_id_occurred_at_idx" ON "session_publication_events"("publication_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "result_exports_source_command_id_key" ON "result_exports"("source_command_id");

-- CreateIndex
CREATE INDEX "result_exports_club_id_session_id_created_at_idx" ON "result_exports"("club_id", "session_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "session_publications" ADD CONSTRAINT "session_publications_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "queue_sessions"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_publications" ADD CONSTRAINT "session_publications_club_id_session_id_published_snapshot_fkey" FOREIGN KEY ("club_id", "session_id", "published_snapshot_id") REFERENCES "session_result_snapshots"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_publications" ADD CONSTRAINT "session_publications_club_id_expiry_cycle_id_fkey" FOREIGN KEY ("club_id", "expiry_cycle_id") REFERENCES "club_expiry_cycles"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_publication_events" ADD CONSTRAINT "session_publication_events_club_id_session_id_publication__fkey" FOREIGN KEY ("club_id", "session_id", "publication_id") REFERENCES "session_publications"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_publication_events" ADD CONSTRAINT "session_publication_events_club_id_session_id_snapshot_id_fkey" FOREIGN KEY ("club_id", "session_id", "snapshot_id") REFERENCES "session_result_snapshots"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_publication_events" ADD CONSTRAINT "session_publication_events_club_id_device_id_fkey" FOREIGN KEY ("club_id", "device_id") REFERENCES "devices"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_exports" ADD CONSTRAINT "result_exports_club_id_session_id_snapshot_id_fkey" FOREIGN KEY ("club_id", "session_id", "snapshot_id") REFERENCES "session_result_snapshots"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Slide sets: non-empty when present, no duplicates, Off Day only with the awards slide.
CREATE FUNCTION "rotra_valid_slides"(slides "result_slide"[], include_off_day boolean)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT cardinality(slides) BETWEEN 1 AND 2
    AND (cardinality(slides) < 2 OR slides[1] <> slides[2])
    AND (NOT include_off_day OR 'awards' = ANY (slides));
$$;

-- session_publications: the public copy holds only what this publish selected.
ALTER TABLE "session_publications"
  ADD CONSTRAINT "session_publications_public_key_check" CHECK ("public_key" ~ '^[A-Za-z0-9_-]{16,64}$'),
  ADD CONSTRAINT "session_publications_published_check" CHECK (
    ("state" = 'published') = (
      "published_snapshot_id" IS NOT NULL AND "published_at" IS NOT NULL AND "public_results" IS NOT NULL
    )
  ),
  ADD CONSTRAINT "session_publications_slides_check" CHECK (
    ("state" <> 'published' AND cardinality("published_slides") = 0 AND NOT "include_off_day")
    OR ("state" = 'published' AND "rotra_valid_slides"("published_slides", "include_off_day"))
  ),
  ADD CONSTRAINT "session_publications_public_results_check" CHECK (
    "public_results" IS NULL OR (
      jsonb_typeof("public_results") = 'object'
      AND ("include_off_day" OR NOT ("public_results" ? 'offDay'))
      AND ('standings' = ANY ("published_slides") OR NOT ("public_results" ? 'standings'))
      AND ('awards' = ANY ("published_slides") OR NOT ("public_results" ? 'awards'))
      AND ("public_results" - ARRAY['standings', 'awards', 'offDay']) = '{}'::jsonb
    )
  ),
  ADD CONSTRAINT "session_publications_deleted_check" CHECK (
    ("state" = 'deleted') = ("deleted_at" IS NOT NULL)
    AND ("state" <> 'deleted' OR "public_results" IS NULL)
  );

-- Retention may delete a page only for the exact running cycle it was retained under, after that
-- cycle's deadline. A job queued before renewal finds the cycle cancelled and fails.
CREATE FUNCTION "session_publications_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'publication rows are never deleted' USING ERRCODE = 'restrict_violation';
  END IF;
  IF OLD."state" = 'deleted' THEN
    RAISE EXCEPTION 'publication % was deleted; restoration is not specified', OLD."id" USING ERRCODE = 'restrict_violation';
  END IF;
  IF NEW."state" = 'deleted' THEN
    IF NEW."expiry_cycle_id" IS DISTINCT FROM OLD."expiry_cycle_id" OR NEW."expiry_cycle_id" IS NULL
       OR NOT EXISTS (
         SELECT 1 FROM "club_expiry_cycles" c
         WHERE c."id" = NEW."expiry_cycle_id" AND c."club_id" = NEW."club_id"
           AND c."state" = 'running' AND c."delete_public_pages_after" <= CURRENT_TIMESTAMP
       ) THEN
      RAISE EXCEPTION 'publication % is not due for deletion under its expiry cycle', OLD."id"
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "session_publications_guard"
  BEFORE UPDATE OR DELETE ON "session_publications"
  FOR EACH ROW EXECUTE FUNCTION "session_publications_guard"();

-- session_publication_events: append-only consent log.
ALTER TABLE "session_publication_events"
  ADD CONSTRAINT "session_publication_events_slides_check" CHECK ("rotra_valid_slides"("slides", "include_off_day")),
  ADD CONSTRAINT "session_publication_events_actor_check" CHECK ("actor_club_id" = "club_id");
CREATE TRIGGER "session_publication_events_append_only"
  BEFORE UPDATE OR DELETE ON "session_publication_events"
  FOR EACH ROW EXECUTE FUNCTION "rotra_reject_mutation"();

-- result_exports: private, soft-deleted, never cascaded into history.
ALTER TABLE "result_exports"
  ADD CONSTRAINT "result_exports_slides_check" CHECK ("rotra_valid_slides"("slides", "include_off_day")),
  ADD CONSTRAINT "result_exports_footer_check" CHECK ("footer" = 'powered by rotra'),
  ADD CONSTRAINT "result_exports_frames_check" CHECK ("frame_count" > 0),
  ADD CONSTRAINT "result_exports_club_name_check" CHECK (length(btrim("club_name_snapshot")) > 0);
CREATE TRIGGER "result_exports_no_delete"
  BEFORE DELETE ON "result_exports"
  FOR EACH ROW EXECUTE FUNCTION "rotra_reject_mutation"();

REVOKE ALL ON "session_publications", "session_publication_events", "result_exports" FROM anon, authenticated;
REVOKE ALL ON FUNCTION "session_publications_guard"() FROM PUBLIC;
