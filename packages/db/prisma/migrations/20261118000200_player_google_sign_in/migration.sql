-- Google sign-in for players (D-2026-11-16-01, P12.7 #922). Additive only: two nullable columns on
-- player_accounts, nothing altered or dropped, no backfill (every existing account starts with no
-- Google). ROTRA stores the connected Google account's email and when it was connected; it never
-- stores a Google token. Apply to a shared database only after human sign-off.

-- AlterTable
ALTER TABLE "player_accounts"
  ADD COLUMN "google_email" TEXT,
  ADD COLUMN "google_linked_at" TIMESTAMPTZ(6);

-- One ROTRA account per Google email. Unique when set (NULLs never collide).
CREATE UNIQUE INDEX "player_accounts_google_email_key" ON "player_accounts"("google_email");

-- Normalized like player_private_contacts.email (trimmed + lowercased), so the unique index compares
-- without case; and the email and its timestamp are set together or not at all.
ALTER TABLE "player_accounts"
  ADD CONSTRAINT "player_accounts_google_email_check" CHECK (
    "google_email" IS NULL
    OR ("google_email" = lower(btrim("google_email")) AND "google_email" ~ '^[^@\s]+@[^@\s]+$')
  ),
  ADD CONSTRAINT "player_accounts_google_linked_check" CHECK (
    ("google_email" IS NULL) = ("google_linked_at" IS NULL)
  );
