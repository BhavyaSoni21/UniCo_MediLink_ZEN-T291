-- CreateEnum
CREATE TYPE "reservation_status_enum" AS ENUM ('PENDING', 'READY', 'COLLECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "pharmacies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hospital_id" UUID,
    "pharmacy_name" VARCHAR(255) NOT NULL,
    "address_line_1" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "contact_number" VARCHAR(20),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_inventory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pharmacy_id" UUID NOT NULL,
    "medicine_id" UUID NOT NULL,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "last_updated" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacy_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_reservations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "pharmacy_id" UUID NOT NULL,
    "medicine_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "reservation_status_enum" NOT NULL DEFAULT 'PENDING',
    "pickup_code" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicine_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_pharmacies_city" ON "pharmacies"("city");

-- CreateIndex
CREATE INDEX "idx_pharmacies_hospital" ON "pharmacies"("hospital_id");

-- CreateIndex
CREATE INDEX "idx_inventory_medicine" ON "pharmacy_inventory"("medicine_id");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_inventory_pharmacy_id_medicine_id_key" ON "pharmacy_inventory"("pharmacy_id", "medicine_id");

-- CreateIndex
CREATE INDEX "idx_reservations_patient" ON "medicine_reservations"("patient_id");

-- CreateIndex
CREATE INDEX "idx_reservations_pharmacy" ON "medicine_reservations"("pharmacy_id");

-- CreateIndex
CREATE INDEX "idx_medicines_generic_name" ON "medicines"("generic_name");

-- AddForeignKey
ALTER TABLE "pharmacies" ADD CONSTRAINT "fk_pharmacy_hospital" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_inventory" ADD CONSTRAINT "fk_inventory_pharmacy" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_inventory" ADD CONSTRAINT "fk_inventory_medicine" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_reservations" ADD CONSTRAINT "fk_reservation_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_reservations" ADD CONSTRAINT "fk_reservation_pharmacy" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_reservations" ADD CONSTRAINT "fk_reservation_medicine" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
