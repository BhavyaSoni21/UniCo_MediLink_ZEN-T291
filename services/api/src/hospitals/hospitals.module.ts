import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PatientsModule } from '../patients/patients.module';
import { HospitalsController } from './hospitals.controller';
import { HospitalIntelligenceController } from './hospital-intelligence.controller';
import { HospitalsService } from './hospitals.service';
import {
  HttpHospitalScoringClient,
  HOSPITAL_SCORING_CLIENT,
} from './hospital-scoring-client';

@Module({
  imports: [AuthModule, PatientsModule],
  controllers: [HospitalsController, HospitalIntelligenceController],
  providers: [
    HospitalsService,
    { provide: HOSPITAL_SCORING_CLIENT, useClass: HttpHospitalScoringClient },
  ],
  exports: [HospitalsService],
})
export class HospitalsModule {}
