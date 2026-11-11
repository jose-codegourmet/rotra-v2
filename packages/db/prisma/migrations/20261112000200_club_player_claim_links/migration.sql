-- P08.9 (D-2026-11-11-03): registration invites for a club's unclaimed record. A club_players row
-- with no global player has no players row to hang a player_claim_links row on, so its invite is
-- keyed by (club_id, club_player_id). Purely additive: one new table, its constraints and grants.

-- CreateTable
CREATE TABLE "club_player_claim_links" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "club_player_id" UUID NOT NULL,
    "token_digest" BYTEA NOT NULL,
    "state" "player_claim_link_state" NOT NULL DEFAULT 'active',
    "issued_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "club_player_claim_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "club_player_claim_links_token_digest_key" ON "club_player_claim_links"("token_digest");

-- CreateIndex
CREATE INDEX "club_player_claim_links_club_id_club_player_id_issued_at_idx" ON "club_player_claim_links"("club_id", "club_player_id", "issued_at" DESC);

-- AddForeignKey
ALTER TABLE "club_player_claim_links" ADD CONSTRAINT "club_player_claim_links_club_id_club_player_id_fkey" FOREIGN KEY ("club_id", "club_player_id") REFERENCES "club_players"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written: the same evidence rules as player_claim_links, one active link per club record.
ALTER TABLE "club_player_claim_links"
  ADD CONSTRAINT "club_player_claim_links_digest_check" CHECK (octet_length("token_digest") = 32),
  ADD CONSTRAINT "club_player_claim_links_expiry_check" CHECK ("expires_at" > "issued_at"),
  ADD CONSTRAINT "club_player_claim_links_state_check" CHECK (
    ("state" = 'active' AND "consumed_at" IS NULL AND "revoked_at" IS NULL)
    OR ("state" = 'consumed' AND "consumed_at" IS NOT NULL AND "revoked_at" IS NULL)
    OR ("state" = 'revoked' AND "revoked_at" IS NOT NULL AND "consumed_at" IS NULL)
  );
CREATE UNIQUE INDEX "club_player_claim_links_one_active_per_record"
  ON "club_player_claim_links" ("club_id", "club_player_id") WHERE "state" = 'active';

ALTER TABLE "club_player_claim_links" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "club_player_claim_links" FROM anon, authenticated, PUBLIC;
