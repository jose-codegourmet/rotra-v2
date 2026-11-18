-- Feature flag player_google_sign_in (D-2026-11-18-01, P12.8 #938). The first flag that ships with the
-- product, so no admin added it: both admin columns become nullable (null = seeded, like
-- admin_settings.updated_by_admin_id). Existing rows keep their admins.
ALTER TABLE "feature_flags"
  ALTER COLUMN "created_by_admin_id" DROP NOT NULL,
  ALTER COLUMN "updated_by_admin_id" DROP NOT NULL;

-- Off. Inserted only when missing: an existing row (or an owner-chosen name) is never overwritten.
INSERT INTO "feature_flags" ("key", "name", "description", "value", "updated_at")
VALUES (
  'player_google_sign_in',
  'Google sign-in for players',
  'Players sign in and register with Continue with Google. While off, the Player app uses email and password as before.',
  false,
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;
