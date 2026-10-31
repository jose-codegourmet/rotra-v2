-- F07.15 · inventory, cost estimates, shuttle plans and payment marks (#256)
-- DRAFT for review. Generated with `prisma migrate diff`, plus hand-written money CHECKs.
-- Not applied to any shared database; needs sign-off.
-- Open: no-fee paid ticks, maximum ranges, post-finalization payment lifecycle (#245);
-- plan-line unit-cost snapshot; offline inventory edits.

-- CreateEnum
CREATE TYPE "inventory_category" AS ENUM ('shuttlecocks', 'equipment', 'other');

-- CreateEnum
CREATE TYPE "payment_mode" AS ENUM ('break_even', 'custom');

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "inventory_category" NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "stock" INTEGER NOT NULL,
    "unit_cost_minor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PHP',
    "removed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_cost_estimates" (
    "session_id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "court_fee_per_court_hour_minor" INTEGER,
    "entrance_fee_per_head_minor" INTEGER,
    "payment_mode" "payment_mode" NOT NULL DEFAULT 'break_even',
    "custom_fee_per_head_minor" INTEGER,
    "currency" CHAR(3) NOT NULL DEFAULT 'PHP',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "session_cost_estimates_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "session_shuttle_plan_lines" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "tubes" INTEGER NOT NULL,
    "position" SMALLINT NOT NULL,

    CONSTRAINT "session_shuttle_plan_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_payment_marks" (
    "session_id" UUID NOT NULL,
    "session_player_id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "amount_minor" INTEGER,
    "currency" CHAR(3) NOT NULL DEFAULT 'PHP',
    "marked_at" TIMESTAMPTZ(6) NOT NULL,
    "source_operation_id" UUID NOT NULL,
    "actor_club_id" UUID NOT NULL,
    "device_id" UUID,

    CONSTRAINT "session_payment_marks_pkey" PRIMARY KEY ("session_id","session_player_id")
);

-- CreateIndex
CREATE INDEX "inventory_items_club_id_category_name_idx" ON "inventory_items"("club_id", "category", "name");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_club_id_id_key" ON "inventory_items"("club_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "session_cost_estimates_club_id_session_id_key" ON "session_cost_estimates"("club_id", "session_id");

-- CreateIndex
CREATE INDEX "session_shuttle_plan_lines_club_id_session_id_position_idx" ON "session_shuttle_plan_lines"("club_id", "session_id", "position");

-- CreateIndex
CREATE INDEX "session_shuttle_plan_lines_club_id_inventory_item_id_idx" ON "session_shuttle_plan_lines"("club_id", "inventory_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_payment_marks_source_operation_id_key" ON "session_payment_marks"("source_operation_id");

-- CreateIndex
CREATE INDEX "session_payment_marks_club_id_session_id_idx" ON "session_payment_marks"("club_id", "session_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_payment_marks_club_id_session_id_session_player_id_key" ON "session_payment_marks"("club_id", "session_id", "session_player_id");

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_cost_estimates" ADD CONSTRAINT "session_cost_estimates_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "queue_sessions"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_shuttle_plan_lines" ADD CONSTRAINT "session_shuttle_plan_lines_club_id_session_id_fkey" FOREIGN KEY ("club_id", "session_id") REFERENCES "session_cost_estimates"("club_id", "session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_shuttle_plan_lines" ADD CONSTRAINT "session_shuttle_plan_lines_club_id_inventory_item_id_fkey" FOREIGN KEY ("club_id", "inventory_item_id") REFERENCES "inventory_items"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_payment_marks" ADD CONSTRAINT "session_payment_marks_club_id_session_id_session_player_id_fkey" FOREIGN KEY ("club_id", "session_id", "session_player_id") REFERENCES "session_players"("club_id", "session_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_payment_marks" ADD CONSTRAINT "session_payment_marks_club_id_device_id_fkey" FOREIGN KEY ("club_id", "device_id") REFERENCES "devices"("club_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- inventory_items
ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_name_check" CHECK (length(btrim("name")) > 0),
  ADD CONSTRAINT "inventory_items_unit_check" CHECK (length(btrim("unit")) > 0),
  ADD CONSTRAINT "inventory_items_stock_check" CHECK ("stock" >= 0),
  ADD CONSTRAINT "inventory_items_unit_cost_check" CHECK ("unit_cost_minor" >= 0),
  ADD CONSTRAINT "inventory_items_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$');

-- session_cost_estimates: null = not set; custom needs its own fee, break-even has none.
ALTER TABLE "session_cost_estimates"
  ADD CONSTRAINT "session_cost_estimates_fees_check" CHECK (
    ("court_fee_per_court_hour_minor" IS NULL OR "court_fee_per_court_hour_minor" >= 0)
    AND ("entrance_fee_per_head_minor" IS NULL OR "entrance_fee_per_head_minor" >= 0)
    AND ("custom_fee_per_head_minor" IS NULL OR "custom_fee_per_head_minor" >= 0)
  ),
  ADD CONSTRAINT "session_cost_estimates_mode_check" CHECK (
    ("payment_mode" = 'custom' AND "custom_fee_per_head_minor" IS NOT NULL)
    OR ("payment_mode" = 'break_even' AND "custom_fee_per_head_minor" IS NULL)
  ),
  ADD CONSTRAINT "session_cost_estimates_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$');

-- session_shuttle_plan_lines
ALTER TABLE "session_shuttle_plan_lines"
  ADD CONSTRAINT "session_shuttle_plan_lines_tubes_check" CHECK ("tubes" > 0),
  ADD CONSTRAINT "session_shuttle_plan_lines_position_check" CHECK ("position" >= 0);

-- session_payment_marks: recorded amount is evidence; 0 is a deliberate zero, null is no fee set.
ALTER TABLE "session_payment_marks"
  ADD CONSTRAINT "session_payment_marks_amount_check" CHECK ("amount_minor" IS NULL OR "amount_minor" >= 0),
  ADD CONSTRAINT "session_payment_marks_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "session_payment_marks_actor_check" CHECK ("actor_club_id" = "club_id");
-- A tick keeps its amount and identity; unticking deletes and a new tick is a new operation.
CREATE TRIGGER "session_payment_marks_no_update"
  BEFORE UPDATE ON "session_payment_marks"
  FOR EACH ROW EXECUTE FUNCTION "rotra_reject_mutation"();

REVOKE ALL ON "inventory_items", "session_cost_estimates", "session_shuttle_plan_lines",
  "session_payment_marks" FROM anon, authenticated;
