-- CreateTable
CREATE TABLE "hospitals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "hospital_type" "hospital_type_enum" NOT NULL DEFAULT 'PRIVATE',
    "address_line_1" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "emergency_supported" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "contact_number" VARCHAR(20),
    "reliability_score" DECIMAL(3,2) NOT NULL DEFAULT 0.80,
    "accepted_insurance_providers" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "department_name" VARCHAR(150) NOT NULL,
    "description" TEXT,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_operational_status" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "available_beds" INTEGER NOT NULL DEFAULT 0,
    "total_beds" INTEGER NOT NULL DEFAULT 0,
    "available_icu" INTEGER NOT NULL DEFAULT 0,
    "total_icu" INTEGER NOT NULL DEFAULT 0,
    "available_doctors" INTEGER NOT NULL DEFAULT 0,
    "total_doctors" INTEGER NOT NULL DEFAULT 0,
    "emergency_load" INTEGER NOT NULL DEFAULT 0,
    "queue_load" INTEGER NOT NULL DEFAULT 0,
    "ventilators_available" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hospital_operational_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_specialties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "specialization_id" SMALLINT NOT NULL,

    CONSTRAINT "hospital_specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_recommendations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "triage_session_id" UUID,
    "hospital_id" UUID NOT NULL,
    "recommendation_score" DECIMAL(5,2) NOT NULL,
    "eta_minutes" INTEGER NOT NULL,
    "wait_time_minutes" INTEGER NOT NULL,
    "recommendation_reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hospital_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_hospitals_city" ON "hospitals"("city");

-- CreateIndex
CREATE INDEX "idx_departments_hospital" ON "departments"("hospital_id");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_operational_status_hospital_id_key" ON "hospital_operational_status"("hospital_id");

-- CreateIndex
CREATE INDEX "idx_hospital_specialties_hospital" ON "hospital_specialties"("hospital_id");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_specialties_hospital_id_specialization_id_key" ON "hospital_specialties"("hospital_id", "specialization_id");

-- CreateIndex
CREATE INDEX "idx_recommendations_hospital" ON "hospital_recommendations"("hospital_id");

-- CreateIndex
CREATE INDEX "idx_recommendations_session" ON "hospital_recommendations"("triage_session_id");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "fk_department_hospital" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_operational_status" ADD CONSTRAINT "fk_operational_status_hospital" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_specialties" ADD CONSTRAINT "fk_specialty_hospital" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_specialties" ADD CONSTRAINT "fk_specialty_specialization" FOREIGN KEY ("specialization_id") REFERENCES "doctor_specializations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_recommendations" ADD CONSTRAINT "fk_recommendation_hospital" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_recommendations" ADD CONSTRAINT "fk_recommendation_session" FOREIGN KEY ("triage_session_id") REFERENCES "triage_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
