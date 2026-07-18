-- CreateTable
CREATE TABLE "triage_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "status" "triage_status_enum" NOT NULL DEFAULT 'STARTED',
    "symptoms_summary" TEXT,
    "risk_score" INTEGER,
    "urgency_level" "urgency_level_enum",
    "care_level" VARCHAR(100),
    "ai_explanation" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "triage_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptoms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "triage_session_id" UUID NOT NULL,
    "symptom_name" VARCHAR(255) NOT NULL,
    "severity" SMALLINT NOT NULL,
    "duration" VARCHAR(100),

    CONSTRAINT "symptoms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vitals_readings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "triage_session_id" UUID,
    "source_type" "source_type_enum" NOT NULL DEFAULT 'MANUAL',
    "heart_rate" INTEGER,
    "spo2" INTEGER,
    "systolic_bp" INTEGER,
    "diastolic_bp" INTEGER,
    "temperature" DECIMAL(4,1),
    "respiratory_rate" INTEGER,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vitals_readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_triage_patient" ON "triage_sessions"("patient_id");

-- CreateIndex
CREATE INDEX "idx_symptoms_session" ON "symptoms"("triage_session_id");

-- CreateIndex
CREATE INDEX "idx_vitals_patient" ON "vitals_readings"("patient_id");

-- CreateIndex
CREATE INDEX "idx_vitals_session" ON "vitals_readings"("triage_session_id");

-- AddForeignKey
ALTER TABLE "triage_sessions" ADD CONSTRAINT "fk_triage_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptoms" ADD CONSTRAINT "fk_symptom_session" FOREIGN KEY ("triage_session_id") REFERENCES "triage_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitals_readings" ADD CONSTRAINT "fk_vitals_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitals_readings" ADD CONSTRAINT "fk_vitals_session" FOREIGN KEY ("triage_session_id") REFERENCES "triage_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
