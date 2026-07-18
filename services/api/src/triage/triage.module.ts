import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PatientsModule } from '../patients/patients.module';
import { TriageController } from './triage.controller';
import { TriageService } from './triage.service';
import {
  HttpRiskScoringClient,
  RISK_SCORING_CLIENT,
} from './risk-scoring-client';

@Module({
  imports: [AuthModule, PatientsModule],
  controllers: [TriageController],
  providers: [
    TriageService,
    { provide: RISK_SCORING_CLIENT, useClass: HttpRiskScoringClient },
  ],
  exports: [TriageService],
})
export class TriageModule {}
