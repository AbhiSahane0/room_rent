-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('OCCUPIED', 'VACANT', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'MOVED_OUT');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('AADHAAR', 'PAN', 'RENTAL_AGREEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ElectricityMode" AS ENUM ('METER', 'FIXED', 'NONE');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('DRAFT', 'GENERATED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillItemType" AS ENUM ('RENT', 'ELECTRICITY', 'CHARGE', 'LATE_FEE', 'DISCOUNT', 'PREVIOUS_BALANCE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "ChargeType" AS ENUM ('MAINTENANCE', 'WATER', 'CLEANING', 'INTERNET', 'PARKING', 'REPAIR', 'LATE_FEE', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "description" TEXT,
    "bill_prefix" TEXT NOT NULL DEFAULT 'INV',
    "next_bill_seq" INTEGER NOT NULL DEFAULT 1,
    "due_day_of_month" INTEGER NOT NULL DEFAULT 10,
    "default_rate_per_unit" DECIMAL(8,2) NOT NULL DEFAULT 8,
    "bill_footer_note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "room_number" TEXT NOT NULL,
    "floor" TEXT,
    "status" "RoomStatus" NOT NULL DEFAULT 'VACANT',
    "default_rent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "electricity_mode" "ElectricityMode" NOT NULL DEFAULT 'METER',
    "rate_per_unit" DECIMAL(8,2),
    "fixed_electricity" DECIMAL(12,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "alternate_phone" TEXT,
    "email" TEXT,
    "permanent_address" TEXT,
    "current_address" TEXT,
    "emergency_contact" TEXT,
    "emergency_phone" TEXT,
    "occupation" TEXT,
    "joining_date" DATE NOT NULL,
    "notes" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_documents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" "DocumentType" NOT NULL,
    "label" TEXT,
    "storage_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_assignments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "agreed_rent" DECIMAL(12,2) NOT NULL,
    "security_deposit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "electricity_mode" "ElectricityMode" NOT NULL DEFAULT 'METER',
    "rate_per_unit" DECIMAL(8,2),
    "fixed_electricity" DECIMAL(12,2),
    "initial_meter_reading" DECIMAL(12,2),
    "final_meter_reading" DECIMAL(12,2),
    "move_out_notes" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rent_history" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "effective_from" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rent_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electricity_readings" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "billing_period" DATE NOT NULL,
    "previous_reading" DECIMAL(12,2) NOT NULL,
    "current_reading" DECIMAL(12,2) NOT NULL,
    "units" DECIMAL(12,2) NOT NULL,
    "rate_per_unit" DECIMAL(8,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "is_override" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electricity_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charges" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "type" "ChargeType" NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" UUID NOT NULL,
    "bill_number" TEXT NOT NULL,
    "property_id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "billing_period" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'GENERATED',
    "rent_amount" DECIMAL(12,2) NOT NULL,
    "electricity_amount" DECIMAL(12,2) NOT NULL,
    "other_charges_amount" DECIMAL(12,2) NOT NULL,
    "late_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "previous_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_due" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "carried_forward_to_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_items" (
    "id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "type" "BillItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB,

    CONSTRAINT "bill_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "properties_owner_id_idx" ON "properties"("owner_id");

-- CreateIndex
CREATE INDEX "rooms_property_id_status_idx" ON "rooms"("property_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_property_id_room_number_key" ON "rooms"("property_id", "room_number");

-- CreateIndex
CREATE INDEX "tenants_property_id_status_idx" ON "tenants"("property_id", "status");

-- CreateIndex
CREATE INDEX "tenants_full_name_idx" ON "tenants"("full_name");

-- CreateIndex
CREATE INDEX "tenants_phone_idx" ON "tenants"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_documents_storage_key_key" ON "tenant_documents"("storage_key");

-- CreateIndex
CREATE INDEX "tenant_documents_tenant_id_type_idx" ON "tenant_documents"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "room_assignments_tenant_id_idx" ON "room_assignments"("tenant_id");

-- CreateIndex
CREATE INDEX "room_assignments_room_id_status_idx" ON "room_assignments"("room_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "rent_history_assignment_id_effective_from_key" ON "rent_history"("assignment_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "electricity_readings_assignment_id_billing_period_key" ON "electricity_readings"("assignment_id", "billing_period");

-- CreateIndex
CREATE INDEX "charges_assignment_id_idx" ON "charges"("assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "bills_bill_number_key" ON "bills"("bill_number");

-- CreateIndex
CREATE INDEX "bills_property_id_billing_period_idx" ON "bills"("property_id", "billing_period");

-- CreateIndex
CREATE INDEX "bills_tenant_id_billing_period_idx" ON "bills"("tenant_id", "billing_period");

-- CreateIndex
CREATE INDEX "bills_status_due_date_idx" ON "bills"("status", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "bills_assignment_id_billing_period_key" ON "bills"("assignment_id", "billing_period");

-- CreateIndex
CREATE INDEX "bill_items_bill_id_idx" ON "bill_items"("bill_id");

-- CreateIndex
CREATE INDEX "payments_bill_id_idx" ON "payments"("bill_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "payments"("tenant_id");

-- CreateIndex
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_documents" ADD CONSTRAINT "tenant_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_assignments" ADD CONSTRAINT "room_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_assignments" ADD CONSTRAINT "room_assignments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_history" ADD CONSTRAINT "rent_history_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "room_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electricity_readings" ADD CONSTRAINT "electricity_readings_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "room_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "room_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "room_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Business rules enforced at the database level
-- ============================================================================

-- 1. A room can only have one ACTIVE assignment; a tenant only one ACTIVE assignment.
CREATE UNIQUE INDEX "room_assignments_one_active_per_room"
  ON "room_assignments" ("room_id") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "room_assignments_one_active_per_tenant"
  ON "room_assignments" ("tenant_id") WHERE "status" = 'ACTIVE';

-- 2. Invalid amounts are rejected.
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "electricity_readings" ADD CONSTRAINT "electricity_current_gte_previous"
  CHECK ("current_reading" >= "previous_reading" AND "units" >= 0 AND "amount" >= 0);
ALTER TABLE "bills" ADD CONSTRAINT "bills_amounts_non_negative" CHECK (
  "rent_amount" >= 0 AND "electricity_amount" >= 0 AND "other_charges_amount" >= 0 AND
  "late_fee" >= 0 AND "discount" >= 0 AND "previous_balance" >= 0 AND "total_due" >= 0 AND "paid_amount" >= 0);
ALTER TABLE "bills" ADD CONSTRAINT "bills_paid_within_total" CHECK ("paid_amount" <= "total_due");
ALTER TABLE "rent_history" ADD CONSTRAINT "rent_history_amount_non_negative" CHECK ("amount" >= 0);
ALTER TABLE "room_assignments" ADD CONSTRAINT "assignment_dates_valid"
  CHECK ("end_date" IS NULL OR "end_date" >= "start_date");

-- 3. Historical bills cannot be silently modified: the charged amounts are frozen.
--    Only status, paid_amount, carried_forward_to_id and notes may change after creation.
CREATE OR REPLACE FUNCTION prevent_bill_amount_changes() RETURNS trigger AS $$
BEGIN
  IF NEW."rent_amount" IS DISTINCT FROM OLD."rent_amount"
     OR NEW."electricity_amount" IS DISTINCT FROM OLD."electricity_amount"
     OR NEW."other_charges_amount" IS DISTINCT FROM OLD."other_charges_amount"
     OR NEW."late_fee" IS DISTINCT FROM OLD."late_fee"
     OR NEW."discount" IS DISTINCT FROM OLD."discount"
     OR NEW."previous_balance" IS DISTINCT FROM OLD."previous_balance"
     OR NEW."total_due" IS DISTINCT FROM OLD."total_due"
     OR NEW."billing_period" IS DISTINCT FROM OLD."billing_period"
     OR NEW."assignment_id" IS DISTINCT FROM OLD."assignment_id"
     OR NEW."bill_number" IS DISTINCT FROM OLD."bill_number" THEN
    RAISE EXCEPTION 'Bill amounts are immutable once generated';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "bills_freeze_amounts" BEFORE UPDATE ON "bills"
  FOR EACH ROW EXECUTE FUNCTION prevent_bill_amount_changes();

CREATE OR REPLACE FUNCTION prevent_bill_item_changes() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Bill items are immutable once generated';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "bill_items_freeze" BEFORE UPDATE ON "bill_items"
  FOR EACH ROW EXECUTE FUNCTION prevent_bill_item_changes();

-- 4. Payments are an append-only ledger.
CREATE OR REPLACE FUNCTION prevent_payment_changes() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Payments cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "payments_append_only" BEFORE UPDATE OR DELETE ON "payments"
  FOR EACH ROW EXECUTE FUNCTION prevent_payment_changes();
