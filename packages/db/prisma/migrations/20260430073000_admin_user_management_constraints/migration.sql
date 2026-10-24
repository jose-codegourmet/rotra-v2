-- Align admin lifecycle constraints with docs/business_logic/admin_app/08_user_management.md
ALTER TABLE "profiles"
ADD CONSTRAINT "chk_admin_consistency" CHECK (
  ("admin_role" IS NULL AND "admin_invited_at" IS NULL)
  OR
  ("admin_role" IS NOT NULL AND "admin_invited_at" IS NOT NULL)
);

-- Restrict admin-role index to admin rows only
DROP INDEX IF EXISTS "idx_profiles_admin_role";
CREATE INDEX "idx_profiles_admin_role"
ON "profiles"("admin_role")
WHERE "admin_role" IS NOT NULL;

-- Only one pending invitation per email
CREATE UNIQUE INDEX "idx_admin_invitations_pending_email"
ON "admin_invitations"("email")
WHERE "status" = 'pending';
