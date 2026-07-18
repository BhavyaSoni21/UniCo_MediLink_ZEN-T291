/*
  Warnings:

  - Added the required column `patient_id` to the `hospital_recommendations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "hospital_recommendations" ADD COLUMN     "patient_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "idx_recommendations_patient" ON "hospital_recommendations"("patient_id");

-- AddForeignKey
ALTER TABLE "hospital_recommendations" ADD CONSTRAINT "fk_recommendation_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
