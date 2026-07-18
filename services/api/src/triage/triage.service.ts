import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import {
  RISK_SCORING_CLIENT,
  type RiskScoringClient,
} from './risk-scoring-client';
import { SubmitSymptomsDto } from './dto/submit-symptoms.dto';
import { SubmitVitalsDto } from './dto/submit-vitals.dto';
import type {
  source_type_enum,
  urgency_level_enum,
} from '../../generated/prisma/enums';

@Injectable()
export class TriageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patients: PatientsService,
    @Inject(RISK_SCORING_CLIENT)
    private readonly riskScoringClient: RiskScoringClient,
  ) {}

  private async getOwnedSession(userId: string, sessionId: string) {
    const patientId = await this.patients.getPatientIdForUser(userId);
    const session = await this.prisma.triage_sessions.findUnique({
      where: { id: sessionId },
      include: { symptoms: true, vitals_readings: true },
    });
    if (!session || session.patient_id !== patientId) {
      throw new NotFoundException('Triage session not found');
    }
    return session;
  }

  async startSession(userId: string) {
    const patientId = await this.patients.getPatientIdForUser(userId);
    const session = await this.prisma.triage_sessions.create({
      data: { patient_id: patientId },
    });
    return toSessionResponse(session, [], []);
  }

  async submitSymptoms(
    userId: string,
    sessionId: string,
    dto: SubmitSymptomsDto,
  ) {
    await this.getOwnedSession(userId, sessionId);

    await this.prisma.$transaction(async (tx) => {
      await tx.symptoms.deleteMany({ where: { triage_session_id: sessionId } });
      await tx.symptoms.createMany({
        data: dto.symptoms.map((s) => ({
          triage_session_id: sessionId,
          symptom_name: s.symptomName,
          severity: s.severity,
          duration: s.duration,
        })),
      });
      await tx.triage_sessions.update({
        where: { id: sessionId },
        data: {
          symptoms_summary: dto.symptoms.map((s) => s.symptomName).join(', '),
        },
      });
    });

    return this.getSession(userId, sessionId);
  }

  async submitVitals(userId: string, sessionId: string, dto: SubmitVitalsDto) {
    const patient = await this.getOwnedSession(userId, sessionId);

    await this.prisma.vitals_readings.create({
      data: {
        patient_id: patient.patient_id,
        triage_session_id: sessionId,
        source_type: (dto.sourceType as source_type_enum) ?? undefined,
        heart_rate: dto.heartRate,
        spo2: dto.spo2,
        systolic_bp: dto.systolicBp,
        diastolic_bp: dto.diastolicBp,
        temperature: dto.temperature,
        respiratory_rate: dto.respiratoryRate,
      },
    });

    return this.getSession(userId, sessionId);
  }

  async evaluate(userId: string, sessionId: string) {
    const session = await this.getOwnedSession(userId, sessionId);

    const latestVitals = session.vitals_readings.at(-1) ?? null;
    const result = await this.riskScoringClient.evaluate(
      session.symptoms.map((s) => ({
        symptomName: s.symptom_name,
        severity: s.severity,
        duration: s.duration,
      })),
      latestVitals
        ? {
            heartRate: latestVitals.heart_rate,
            spo2: latestVitals.spo2,
            systolicBp: latestVitals.systolic_bp,
            diastolicBp: latestVitals.diastolic_bp,
            temperature: latestVitals.temperature
              ? Number(latestVitals.temperature)
              : null,
            respiratoryRate: latestVitals.respiratory_rate,
          }
        : null,
    );

    const updated = await this.prisma.triage_sessions.update({
      where: { id: sessionId },
      data: {
        risk_score: result.riskScore,
        urgency_level: result.urgencyLevel as urgency_level_enum,
        care_level: result.careLevel,
        ai_explanation: result.explanation,
        status: 'COMPLETED',
      },
      include: { symptoms: true, vitals_readings: true },
    });

    return {
      ...toSessionResponse(updated, updated.symptoms, updated.vitals_readings),
      redFlags: result.redFlags,
    };
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.getOwnedSession(userId, sessionId);
    return toSessionResponse(session, session.symptoms, session.vitals_readings);
  }

  async getHistory(userId: string) {
    const patientId = await this.patients.getPatientIdForUser(userId);
    const sessions = await this.prisma.triage_sessions.findMany({
      where: { patient_id: patientId },
      orderBy: { created_at: 'desc' },
    });
    return sessions.map((s) => toSessionResponse(s, [], []));
  }
}

interface SessionRow {
  id: string;
  status: string;
  symptoms_summary: string | null;
  risk_score: number | null;
  urgency_level: string | null;
  care_level: string | null;
  ai_explanation: string | null;
  created_at: Date;
}

interface SymptomRow {
  id: string;
  symptom_name: string;
  severity: number;
  duration: string | null;
}

interface VitalsRow {
  id: string;
  source_type: string;
  heart_rate: number | null;
  spo2: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  temperature: unknown;
  respiratory_rate: number | null;
  recorded_at: Date;
}

function toSessionResponse(
  session: SessionRow,
  symptoms: SymptomRow[],
  vitalsReadings: VitalsRow[],
) {
  return {
    id: session.id,
    status: session.status,
    symptomsSummary: session.symptoms_summary,
    riskScore: session.risk_score,
    urgencyLevel: session.urgency_level,
    careLevel: session.care_level,
    aiExplanation: session.ai_explanation,
    createdAt: session.created_at,
    symptoms: symptoms.map((s) => ({
      id: s.id,
      symptomName: s.symptom_name,
      severity: s.severity,
      duration: s.duration,
    })),
    vitalsReadings: vitalsReadings.map((v) => ({
      id: v.id,
      sourceType: v.source_type,
      heartRate: v.heart_rate,
      spo2: v.spo2,
      systolicBp: v.systolic_bp,
      diastolicBp: v.diastolic_bp,
      temperature: v.temperature ? Number(v.temperature) : null,
      respiratoryRate: v.respiratory_rate,
      recordedAt: v.recorded_at,
    })),
  };
}
