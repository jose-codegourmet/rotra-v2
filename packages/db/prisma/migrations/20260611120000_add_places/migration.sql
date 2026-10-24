-- CreateEnum
CREATE TYPE "place_status_enum" AS ENUM ('confirmed', 'unreviewed');

-- CreateTable
CREATE TABLE "places" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "status" "place_status_enum" NOT NULL DEFAULT 'unreviewed',
    "submitted_by" UUID,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_places_status" ON "places"("status");

-- CreateIndex
CREATE INDEX "idx_places_submitted_by" ON "places"("submitted_by");

-- CreateIndex
CREATE INDEX "idx_places_lat_lng" ON "places"("latitude", "longitude");

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Row Level Security
ALTER TABLE "places" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Confirmed places visible to authenticated users"
  ON "places" FOR SELECT
  TO authenticated
  USING ("status" = 'confirmed');

CREATE POLICY "Authenticated users can submit unreviewed places"
  ON "places" FOR INSERT
  TO authenticated
  WITH CHECK (
    "status" = 'unreviewed'
    AND "submitted_by" = auth.uid()
  );

CREATE POLICY "Users can view their own unreviewed submissions"
  ON "places" FOR SELECT
  TO authenticated
  USING ("submitted_by" = auth.uid());

-- updated_at trigger (function shared for future tables)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER places_updated_at
  BEFORE UPDATE ON "places"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
