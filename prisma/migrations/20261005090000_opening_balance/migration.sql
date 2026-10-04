-- AlterTable
ALTER TABLE "room_assignments" ADD COLUMN     "opening_balance" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "room_assignments" ADD CONSTRAINT "assignment_opening_balance_non_negative" CHECK ("opening_balance" >= 0);
