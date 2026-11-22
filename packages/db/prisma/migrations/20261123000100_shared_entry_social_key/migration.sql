-- #1019: a social link is an entry key for an unclaimed player, like the email. The shared entry
-- of an unclaimed person can be keyed by a normalized email, a normalized social link
-- (`facebook.com/name`: provider site, lower case, no query, hash or trailing slash), or both.
-- Both keys are set only while the entry is open and cleared once it is claimed or retired.

-- AlterTable
ALTER TABLE "shared_player_entries" ADD COLUMN "social_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "shared_player_entries_social_key_key" ON "shared_player_entries"("social_key");

-- Hand-written: the key's shape, and the state rule now allows an open entry with a link and no email.
ALTER TABLE "shared_player_entries"
  ADD CONSTRAINT "shared_player_entries_social_key_check" CHECK (
    "social_key" IS NULL
    OR (
      "social_key" = lower("social_key")
      AND "social_key" ~ '^(facebook|instagram|youtube|linkedin)\.com/[^?#[:space:]]*[^/?#[:space:]]$'
    )
  ),
  DROP CONSTRAINT "shared_player_entries_state_check",
  ADD CONSTRAINT "shared_player_entries_state_check" CHECK (
    ("claimed_player_id" IS NULL) = ("claimed_at" IS NULL)
    AND NOT ("claimed_player_id" IS NOT NULL AND "retired_at" IS NOT NULL)
    AND (
      CASE
        WHEN "claimed_player_id" IS NOT NULL OR "retired_at" IS NOT NULL
          THEN "email" IS NULL AND "social_key" IS NULL
        ELSE "email" IS NOT NULL OR "social_key" IS NOT NULL
      END
    )
  );
