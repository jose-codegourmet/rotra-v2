-- Add soft-delete metadata for admin profile shells retained for audit joins
ALTER TABLE "profiles"
ADD COLUMN "admin_deleted_at" TIMESTAMPTZ(6),
ADD COLUMN "admin_deleted_by" UUID;

ALTER TABLE "profiles"
ADD CONSTRAINT "profiles_admin_deleted_by_fkey"
FOREIGN KEY ("admin_deleted_by")
REFERENCES "profiles"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "idx_profiles_admin_deleted"
ON "profiles"("admin_deleted_at")
WHERE "admin_deleted_at" IS NOT NULL;

ALTER TYPE "admin_action_enum" ADD VALUE 'admin_deleted';
