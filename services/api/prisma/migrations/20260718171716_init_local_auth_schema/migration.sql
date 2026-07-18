-- CreateEnum
CREATE TYPE "account_status_enum" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "alert_severity_enum" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "allergy_severity_enum" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "appointment_status_enum" AS ENUM ('SCHEDULED', 'CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "appointment_type_enum" AS ENUM ('CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'TELECONSULTATION');

-- CreateEnum
CREATE TYPE "blood_group_enum" AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "condition_status_enum" AS ENUM ('ACTIVE', 'MANAGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "consent_grantee_type_enum" AS ENUM ('DOCTOR', 'HOSPITAL', 'PHARMACY');

-- CreateEnum
CREATE TYPE "consent_status_enum" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "consultation_mode_enum" AS ENUM ('ONLINE', 'OFFLINE', 'BOTH');

-- CreateEnum
CREATE TYPE "gender_enum" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "hospital_type_enum" AS ENUM ('GOVERNMENT', 'PRIVATE', 'TRUST', 'MILITARY', 'SPECIALTY');

-- CreateEnum
CREATE TYPE "notification_type_enum" AS ENUM ('GENERAL', 'SYSTEM', 'APPOINTMENT', 'EMERGENCY', 'REMINDER');

-- CreateEnum
CREATE TYPE "queue_status_enum" AS ENUM ('WAITING', 'CALLED', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "record_access_action_enum" AS ENUM ('VIEW', 'DOWNLOAD', 'SHARE', 'DELETE');

-- CreateEnum
CREATE TYPE "record_type_enum" AS ENUM ('CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'SURGERY', 'TELECONSULTATION');

-- CreateEnum
CREATE TYPE "source_type_enum" AS ENUM ('MANUAL', 'SIMULATED', 'DEVICE');

-- CreateEnum
CREATE TYPE "triage_status_enum" AS ENUM ('STARTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "urgency_level_enum" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY');

-- CreateTable
CREATE TABLE "doctor_specializations" (
    "id" SMALLSERIAL NOT NULL,
    "specialization_name" VARCHAR(100) NOT NULL,
    "description" TEXT,

    CONSTRAINT "doctor_specializations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "generic_name" VARCHAR(255) NOT NULL,
    "brand_name" VARCHAR(255),
    "manufacturer" VARCHAR(255),
    "dosage_form" VARCHAR(100),
    "strength" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playing_with_neon" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "value" REAL,

    CONSTRAINT "playing_with_neon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SMALLSERIAL NOT NULL,
    "role_name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configuration" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "config_key" VARCHAR(100) NOT NULL,
    "config_value" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_id" SMALLINT,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "name" VARCHAR(255),
    "password_hash" VARCHAR(255),
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "account_status" "account_status_enum" NOT NULL DEFAULT 'ACTIVE',
    "last_login" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "date_of_birth" DATE,
    "gender" "gender_enum",
    "blood_group" "blood_group_enum" DEFAULT 'UNKNOWN',
    "height_cm" DECIMAL(5,2),
    "weight_kg" DECIMAL(5,2),
    "profile_photo_key" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "address_line_1" VARCHAR(255) NOT NULL,
    "address_line_2" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(100),
    "pincode" VARCHAR(20),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "relationship" VARCHAR(50),
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_conditions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "condition_name" VARCHAR(255) NOT NULL,
    "diagnosis_date" DATE,
    "status" "condition_status_enum" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "allergy_name" VARCHAR(255) NOT NULL,
    "severity" "allergy_severity_enum" NOT NULL DEFAULT 'UNKNOWN',
    "reaction" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "medicine_name" VARCHAR(255) NOT NULL,
    "dosage" VARCHAR(100),
    "frequency" VARCHAR(100),
    "start_date" DATE,
    "end_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "provider_name" VARCHAR(255) NOT NULL,
    "policy_number" VARCHAR(100) NOT NULL,
    "coverage_type" VARCHAR(100),
    "valid_until" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID,
    "record_type" "record_type_enum" NOT NULL DEFAULT 'CONSULTATION',
    "visit_date" DATE,
    "summary" TEXT,
    "diagnosis" TEXT,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "medical_record_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_type" VARCHAR(100) NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "file_size_bytes" INTEGER,
    "ocr_text" TEXT,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "granted_to_type" "consent_grantee_type_enum" NOT NULL,
    "granted_to_id" UUID NOT NULL,
    "record_id" UUID,
    "status" "consent_status_enum" NOT NULL DEFAULT 'ACTIVE',
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_access_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "medical_record_id" UUID NOT NULL,
    "accessed_by" UUID NOT NULL,
    "action" "record_access_action_enum" NOT NULL,
    "access_time" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),

    CONSTRAINT "record_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "doctor_specializations_specialization_name_key" ON "doctor_specializations"("specialization_name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_role_name_key" ON "roles"("role_name");

-- CreateIndex
CREATE UNIQUE INDEX "system_configuration_config_key_key" ON "system_configuration"("config_key");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_phone" ON "users"("phone");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "idx_users_status" ON "users"("account_status");

-- CreateIndex
CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("user_id");

-- CreateIndex
CREATE INDEX "idx_patients_user" ON "patients"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "addresses_patient_id_key" ON "addresses"("patient_id");

-- CreateIndex
CREATE INDEX "idx_emergency_contacts_patient" ON "emergency_contacts"("patient_id");

-- CreateIndex
CREATE INDEX "idx_medical_conditions_patient" ON "medical_conditions"("patient_id");

-- CreateIndex
CREATE INDEX "idx_allergies_patient" ON "allergies"("patient_id");

-- CreateIndex
CREATE INDEX "idx_medications_patient" ON "medications"("patient_id");

-- CreateIndex
CREATE INDEX "idx_insurances_patient" ON "insurances"("patient_id");

-- CreateIndex
CREATE INDEX "idx_medical_records_patient" ON "medical_records"("patient_id");

-- CreateIndex
CREATE INDEX "idx_medical_files_record" ON "medical_files"("medical_record_id");

-- CreateIndex
CREATE INDEX "idx_consents_patient" ON "consents"("patient_id");

-- CreateIndex
CREATE INDEX "idx_consents_grantee" ON "consents"("granted_to_id");

-- CreateIndex
CREATE INDEX "idx_consents_record" ON "consents"("record_id");

-- CreateIndex
CREATE INDEX "idx_access_logs_record" ON "record_access_logs"("medical_record_id");

-- CreateIndex
CREATE INDEX "idx_access_logs_accessor" ON "record_access_logs"("accessed_by");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "fk_user_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "fk_patient_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "fk_address_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "fk_emergency_contact_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_conditions" ADD CONSTRAINT "fk_condition_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergies" ADD CONSTRAINT "fk_allergy_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "fk_medication_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurances" ADD CONSTRAINT "fk_insurance_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "fk_record_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_files" ADD CONSTRAINT "fk_file_record" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "fk_consent_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "fk_consent_record" FOREIGN KEY ("record_id") REFERENCES "medical_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_access_logs" ADD CONSTRAINT "fk_access_log_record" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_access_logs" ADD CONSTRAINT "fk_access_log_accessed_by" FOREIGN KEY ("accessed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
