-- #491. Additive migration; apply to a shared database only after human sign-off.
-- CreateEnum
CREATE TYPE "password_reset_request_status" AS ENUM ('pending', 'issued', 'declined');

-- CreateTable
CREATE TABLE "player_password_reset_requests" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "player_id" UUID,
    "status" "password_reset_request_status" NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by_admin_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "auth_subject" UUID,
    "token_digest" BYTEA,
    "issuance_id" UUID,
    "issuance_started_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,
    "consumed_at" TIMESTAMPTZ(6),

    CONSTRAINT "player_password_reset_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "player_password_reset_requests_token_digest_key" ON "player_password_reset_requests"("token_digest");

-- CreateIndex
CREATE INDEX "player_password_reset_requests_status_requested_at_idx" ON "player_password_reset_requests"("status", "requested_at" DESC);

-- CreateIndex
CREATE INDEX "player_password_reset_requests_requested_at_id_idx" ON "player_password_reset_requests"("requested_at" DESC, "id");

-- CreateIndex
CREATE INDEX "player_password_reset_requests_player_id_idx" ON "player_password_reset_requests"("player_id");

-- CreateIndex
CREATE INDEX "player_password_reset_requests_reviewed_by_admin_id_idx" ON "player_password_reset_requests"("reviewed_by_admin_id");

-- AddForeignKey
ALTER TABLE "player_password_reset_requests" ADD CONSTRAINT "player_password_reset_requests_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_password_reset_requests" ADD CONSTRAINT "player_password_reset_requests_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "admin_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- One unresolved submission per normalized address, including simultaneous requests.
CREATE UNIQUE INDEX "password_reset_one_pending_email"
  ON "player_password_reset_requests" ("email") WHERE "status" = 'pending';
ALTER TABLE "player_password_reset_requests"
  ADD CONSTRAINT "password_reset_email_normalized" CHECK (
    "email" = lower(btrim("email")) AND length("email") BETWEEN 3 AND 254
  ),
  ADD CONSTRAINT "password_reset_review_state" CHECK (
    ("status" = 'pending' AND "reviewed_by_admin_id" IS NULL AND "reviewed_at" IS NULL)
    OR ("status" <> 'pending' AND "reviewed_by_admin_id" IS NOT NULL AND "reviewed_at" IS NOT NULL)
  ),
  ADD CONSTRAINT "password_reset_issued_identity" CHECK (
    "status" <> 'issued' OR ("player_id" IS NOT NULL AND "auth_subject" IS NOT NULL)
  ),
  ADD CONSTRAINT "password_reset_digest" CHECK (
    "token_digest" IS NULL OR (octet_length("token_digest") = 32 AND "status" = 'issued' AND "consumed_at" IS NULL)
  ),
  ADD CONSTRAINT "password_reset_issuance_lease" CHECK (
    ("issuance_id" IS NULL) = ("issuance_started_at" IS NULL)
  ),
  ADD CONSTRAINT "password_reset_revision_positive" CHECK ("revision" > 0);

ALTER TABLE "player_password_reset_requests" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "player_password_reset_requests" FROM anon, authenticated, PUBLIC;
