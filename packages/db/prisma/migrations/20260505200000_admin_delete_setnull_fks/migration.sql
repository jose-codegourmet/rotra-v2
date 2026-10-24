-- Revert soft-delete columns from admin user delete v1; enable profile cascade when auth.users is deleted
DROP INDEX IF EXISTS "idx_profiles_admin_deleted";
ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "profiles_admin_deleted_by_fkey";
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "admin_deleted_at";
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "admin_deleted_by";

-- Allow admin_action_log rows to survive without actor profile after cascade
ALTER TABLE "admin_action_log" DROP CONSTRAINT IF EXISTS "admin_action_log_admin_id_fkey";
ALTER TABLE "admin_action_log" ALTER COLUMN "admin_id" DROP NOT NULL;
ALTER TABLE "admin_action_log"
  ADD CONSTRAINT "admin_action_log_admin_id_fkey"
  FOREIGN KEY ("admin_id") REFERENCES "profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Allow admin_invitations to survive without inviter after cascade
ALTER TABLE "admin_invitations" DROP CONSTRAINT IF EXISTS "admin_invitations_invited_by_fkey";
ALTER TABLE "admin_invitations" ALTER COLUMN "invited_by" DROP NOT NULL;
ALTER TABLE "admin_invitations"
  ADD CONSTRAINT "admin_invitations_invited_by_fkey"
  FOREIGN KEY ("invited_by") REFERENCES "profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
