import { Injectable } from '@nestjs/common';

export interface RiskScoringSymptomInput {
  symptomName: string;
  severity: number;
  duration?: string | null;
}

export interface RiskScoringVitalsInput {
  heartRate?: number | null;
  spo2?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  temperature?: number | null;
  respiratoryRate?: number | null;
}

export interface RiskEvaluationResult {
  riskScore: number;
  urgencyLevel: string;
  careLevel: string;
  explanation: string;
  redFlags: string[];
}

export const RISK_SCORING_CLIENT = Symbol('RISK_SCORING_CLIENT');

export interface RiskScoringClient {
  evaluate(
    symptoms: RiskScoringSymptomInput[],
    vitals: RiskScoringVitalsInput | null,
  ): Promise<RiskEvaluationResult>;
}

@Injectable()
export class HttpRiskScoringClient implements RiskScoringClient {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  }

  async evaluate(
    symptoms: RiskScoringSymptomInput[],
    vitals: RiskScoringVitalsInput | null,
  ): Promise<RiskEvaluationResult> {
    const res = await fetch(`${this.baseUrl}/risk/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symptoms: symptoms.map((s) => ({
          symptom_name: s.symptomName,
          severity: s.severity,
          duration: s.duration ?? undefined,
        })),
        vitals: vitals
          ? {
              heart_rate: vitals.heartRate ?? undefined,
              spo2: vitals.spo2 ?? undefined,
              systolic_bp: vitals.systolicBp ?? undefined,
              diastolic_bp: vitals.diastolicBp ?? undefined,
              temperature: vitals.temperature ?? undefined,
              respiratory_rate: vitals.respiratoryRate ?? undefined,
            }
          : undefined,
      }),
    });

    if (!res.ok) {
      throw new Error(`AI service risk evaluation failed (${res.status})`);
    }

    const body = (await res.json()) as {
      risk_score: number;
      urgency_level: string;
      care_level: string;
      explanation: string;
      red_flags: string[];
    };

    return {
      riskScore: body.risk_score,
      urgencyLevel: body.urgency_level,
      careLevel: body.care_level,
      explanation: body.explanation,
      redFlags: body.red_flags,
    };
  }
}
