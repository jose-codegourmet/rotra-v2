-- F07.12 · device streams, operation receipts and sync conflicts (#253)
-- DRAFT for review. Generated with `prisma migrate diff`, plus hand-written CHECKs and the
-- immutable-envelope trigger. Also adds the deferred club-scoped device FKs on club_assessments and
-- session_join_requests. Not applied; needs sign-off.
-- Open: enrollment, revocation, stream states, zero-operation close, conflict authority (#246).

-- CreateEnum
CREATE TYPE "device_stream_state" AS ENUM ('open', 'sealed', 'revoked');

-- CreateEnum
CREATE TYPE "sync_operation_state" AS ENUM ('received', 'waiting', 'accepted', 'rejected', 'conflicted');

-- CreateEnum
CREATE TYPE "sync_conflict_category" AS ENUM ('revision_mismatch', 'payload_mismatch', 'contradictory_decision', 'missing_prerequisite', 'identity_link');

-- CreateEnum
CREATE TYPE "sync_conflict_state" AS ENUM ('open', 'resolved');

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "registered_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "revoke_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_session_streams" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "generation_no" INTEGER NOT NULL,
    "downloaded_revision" BIGINT NOT NULL,
    "contiguous_sequence" BIGINT NOT NULL DEFAULT 0,
    "highest_received_sequence" BIGINT NOT NULL DEFAULT 0,
    "sealed_final_sequence" BIGINT,
    "sealed_digest" BYTEA,
    "sealed_at" TIMESTAMPTZ(6),
    "state" "device_stream_state" NOT NULL DEFAULT 'open',
    "enrolled_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "device_session_streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_operations" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "stream_id" UUID NOT NULL,
    "sequence" BIGINT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "command_kind" TEXT NOT NULL,
    "base_revision" BIGINT,
    "payload_version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "payload_digest" BYTEA NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" "sync_operation_state" NOT NULL DEFAULT 'received',
    "processed_at" TIMESTAMPTZ(6),
    "result_revision" BIGINT,
    "rejection_code" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sync_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_conflicts" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "category" "sync_conflict_category" NOT NULL,
    "state" "sync_conflict_state" NOT NULL DEFAULT 'open',
    "detected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evidence" JSONB,
    "resolved_at" TIMESTAMPTZ(6),
    "resolution_evidence" JSONB,
    "resolved_by_device_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "sync_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_conflict_operations" (
    "conflict_id" UUID NOT NULL,
    "operation_id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,

    CONSTRAINT "sync_conflict_operations_pkey" PRIMARY KEY ("conflict_id","operation_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_club_id_id_key" ON "devices"("club_id", "id");

-- CreateIndex
CREATE INDEX "device_session_streams_club_id_device_id_idx" ON "device_session_streams"("club_id", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_session_streams_session_id_device_id_generation_no_key" ON "device_session_streams"("session_id", "device_id", "generation_no");

-- CreateIndex
CREATE UNIQUE INDEX "device_session_streams_club_id_session_id_id_key" ON "device_session_streams"("club_id", "session_id", "id");

-- CreateIndex
CREATE INDEX "sync_operations_session_id_state_received_at_idx" ON "sync_operations"("session_id", "state", "received_at");

-- CreateIndex
CREATE INDEX "sync_operations_session_id_entity_type_entity_id_idx" ON "sync_operations"("session_id", "entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "sync_operations_stream_id_sequence_key" ON "sync_operations"("stream_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "sync_operations_club_id_session_id_id_key" ON "sync_operations"("club_id", "session_id", "id");

-- CreateIndex
CREATE INDEX "sync_conflicts_session_id_state_detected_at_idx" ON "sync_conflicts"("session_id", "state", "detected_at");

-- CreateIndex
CREATE UNIQUE INDEX "sync_conflicts_club_id_session_id_id_key" ON "sync_conflicts"("club_id", "session_id", "id");

-- CreateIndex
CREATE INDEX "sync_conflict_operations_operation_id_idx" ON "sync_conflict_operations"("operation_id");

-- AddForeignKey
ALTER TABLE "club_assessments" ADD CONSTRAINT "club_assessments_club_id_device_id_fkey" FOREIGN KEY ("club_id", "device_id") REFERENCES "devices"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_join_requests" ADD CONSTRAINT "session_join_requests_club_id_decided_by_device_id_fkey" FOREIGN KEY ("club_id", "decided_by_device_id") REFERENCES "devices"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "club_accounts"("club_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_session_streams" ADD CONSTRAINT "device_session_streams_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "queue_sessions"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_session_streams" ADD CONSTRAINT "device_session_streams_club_id_device_id_fkey" FOREIGN KEY ("club_id", "device_id") REFERENCES "devices"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_operations" ADD CONSTRAINT "sync_operations_club_id_session_id_stream_id_fkey" FOREIGN KEY ("club_id", "session_id", "stream_id") REFERENCES "device_session_streams"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "queue_sessions"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_club_id_resolved_by_device_id_fkey" FOREIGN KEY ("club_id", "resolved_by_device_id") REFERENCES "devices"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_conflict_operations" ADD CONSTRAINT "sync_conflict_operations_club_id_session_id_conflict_id_fkey" FOREIGN KEY ("club_id", "session_id", "conflict_id") REFERENCES "sync_conflicts"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_conflict_operations" ADD CONSTRAINT "sync_conflict_operations_club_id_session_id_operation_id_fkey" FOREIGN KEY ("club_id", "session_id", "operation_id") REFERENCES "sync_operations"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- devices
ALTER TABLE "devices"
  ADD CONSTRAINT "devices_label_check" CHECK (length(btrim("label")) > 0),
  ADD CONSTRAINT "devices_revoke_check" CHECK ("revoke_reason" IS NULL OR "revoked_at" IS NOT NULL);

-- device_session_streams: lossless sequences; the contiguous prefix never passes what was seen;
-- a seal carries its final sequence and digest, and the validated prefix may not exceed it.
ALTER TABLE "device_session_streams"
  ADD CONSTRAINT "device_session_streams_generation_check" CHECK ("generation_no" > 0),
  ADD CONSTRAINT "device_session_streams_downloaded_revision_check" CHECK ("downloaded_revision" > 0),
  ADD CONSTRAINT "device_session_streams_sequence_check" CHECK (
    "contiguous_sequence" >= 0 AND "contiguous_sequence" <= "highest_received_sequence"
  ),
  ADD CONSTRAINT "device_session_streams_seal_check" CHECK (
    ("state" = 'sealed') = ("sealed_at" IS NOT NULL)
    AND ("sealed_at" IS NULL) = ("sealed_final_sequence" IS NULL)
    AND ("sealed_final_sequence" IS NULL) = ("sealed_digest" IS NULL)
    AND ("sealed_final_sequence" IS NULL OR "sealed_final_sequence" >= 0)
    AND ("sealed_digest" IS NULL OR octet_length("sealed_digest") = 32)
  );

-- sync_operations: identity, payload and order are fixed at insert; only processing moves.
ALTER TABLE "sync_operations"
  ADD CONSTRAINT "sync_operations_sequence_check" CHECK ("sequence" > 0),
  ADD CONSTRAINT "sync_operations_payload_version_check" CHECK ("payload_version" > 0),
  ADD CONSTRAINT "sync_operations_digest_check" CHECK (octet_length("payload_digest") = 32),
  ADD CONSTRAINT "sync_operations_base_revision_check" CHECK ("base_revision" IS NULL OR "base_revision" > 0),
  ADD CONSTRAINT "sync_operations_kind_check" CHECK (length("entity_type") > 0 AND length("command_kind") > 0),
  ADD CONSTRAINT "sync_operations_processed_check" CHECK (
    ("state" IN ('received', 'waiting')) = ("processed_at" IS NULL)
  ),
  ADD CONSTRAINT "sync_operations_accepted_check" CHECK (("state" = 'accepted') = ("result_revision" IS NOT NULL)),
  ADD CONSTRAINT "sync_operations_rejected_check" CHECK (("state" = 'rejected') = ("rejection_code" IS NOT NULL));

CREATE FUNCTION "sync_operations_envelope_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'sync operation % cannot be deleted', OLD."id" USING ERRCODE = 'restrict_violation';
  END IF;
  IF (NEW."id", NEW."club_id", NEW."session_id", NEW."stream_id", NEW."sequence", NEW."entity_type",
      NEW."entity_id", NEW."command_kind", NEW."base_revision", NEW."payload_version", NEW."payload_digest",
      NEW."occurred_at", NEW."received_at")
     IS DISTINCT FROM
     (OLD."id", OLD."club_id", OLD."session_id", OLD."stream_id", OLD."sequence", OLD."entity_type",
      OLD."entity_id", OLD."command_kind", OLD."base_revision", OLD."payload_version", OLD."payload_digest",
      OLD."occurred_at", OLD."received_at")
     OR NEW."payload"::text IS DISTINCT FROM OLD."payload"::text THEN
    RAISE EXCEPTION 'sync operation % envelope is immutable', OLD."id" USING ERRCODE = 'restrict_violation';
  END IF;
  -- Final outcomes stay final.
  IF OLD."state" IN ('accepted', 'rejected') AND NEW."state" IS DISTINCT FROM OLD."state" THEN
    RAISE EXCEPTION 'sync operation % is already %', OLD."id", OLD."state" USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "sync_operations_envelope_immutable"
  BEFORE UPDATE OR DELETE ON "sync_operations"
  FOR EACH ROW EXECUTE FUNCTION "sync_operations_envelope_immutable"();

-- sync_conflicts: resolution carries evidence; implicated operations are rows, never deleted.
ALTER TABLE "sync_conflicts"
  ADD CONSTRAINT "sync_conflicts_resolution_check" CHECK (
    ("state" = 'resolved') = ("resolved_at" IS NOT NULL AND "resolution_evidence" IS NOT NULL)
  );
CREATE TRIGGER "sync_conflict_operations_append_only"
  BEFORE UPDATE OR DELETE ON "sync_conflict_operations"
  FOR EACH ROW EXECUTE FUNCTION "rotra_reject_mutation"();

REVOKE ALL ON "devices", "device_session_streams", "sync_operations", "sync_conflicts",
  "sync_conflict_operations" FROM anon, authenticated;
REVOKE ALL ON FUNCTION "sync_operations_envelope_immutable"() FROM PUBLIC;
