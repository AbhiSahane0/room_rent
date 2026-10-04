-- DropIndex
DROP INDEX "bills_assignment_id_billing_period_key";

-- AlterTable
ALTER TABLE "electricity_readings" ADD COLUMN     "bill_id" UUID;

-- CreateIndex
CREATE INDEX "bills_assignment_id_billing_period_idx" ON "bills"("assignment_id", "billing_period");

-- CreateIndex
CREATE UNIQUE INDEX "electricity_readings_bill_id_key" ON "electricity_readings"("bill_id");

-- AddForeignKey
ALTER TABLE "electricity_readings" ADD CONSTRAINT "electricity_readings_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Only one live (non-cancelled) bill per assignment and billing period.
-- A cancelled bill frees the slot so it can be regenerated.
CREATE UNIQUE INDEX "bills_one_live_per_assignment_period"
  ON "bills" ("assignment_id", "billing_period") WHERE "status" <> 'CANCELLED';
