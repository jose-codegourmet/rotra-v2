-- CreateTable
CREATE TABLE "profile_tags" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" UUID,

    CONSTRAINT "profile_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_tags_slug_idx" ON "profile_tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "profile_tags_profile_id_slug_key" ON "profile_tags"("profile_id", "slug");

-- AddForeignKey
ALTER TABLE "profile_tags" ADD CONSTRAINT "profile_tags_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_tags" ADD CONSTRAINT "profile_tags_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
