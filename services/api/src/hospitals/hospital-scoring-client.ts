import { Injectable } from '@nestjs/common';

export interface HospitalScoringCandidate {
  hospitalId: string;
  name: string;
  latitude: number;
  longitude: number;
  specialties: string[];
  availableBeds: number;
  totalBeds: number;
  availableDoctors: number;
  totalDoctors: number;
  queueLoad: number;
  reliabilityScore: number;
  acceptedInsuranceProviders: string[];
}

export interface HospitalScoreBreakdown {
  specialty: number;
  eta: number;
  beds: number;
  doctors: number;
  queue: number;
  reliability: number;
  insurance: number;
}

export interface HospitalRankResult {
  hospitalId: string;
  name: string;
  score: number;
  etaMinutes: number;
  waitTimeMinutes: number;
  breakdown: HospitalScoreBreakdown;
  explanation: string;
}

export interface RankHospitalsParams {
  patientLatitude: number;
  patientLongitude: number;
  requiredSpecialization?: string | null;
  insuranceProviders: string[];
  candidates: HospitalScoringCandidate[];
}

export const HOSPITAL_SCORING_CLIENT = Symbol('HOSPITAL_SCORING_CLIENT');

export interface HospitalScoringClient {
  rank(params: RankHospitalsParams): Promise<HospitalRankResult[]>;
}

@Injectable()
export class HttpHospitalScoringClient implements HospitalScoringClient {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  }

  async rank(params: RankHospitalsParams): Promise<HospitalRankResult[]> {
    const res = await fetch(`${this.baseUrl}/hospital-intelligence/rank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_latitude: params.patientLatitude,
        patient_longitude: params.patientLongitude,
        required_specialization: params.requiredSpecialization ?? undefined,
        insurance_providers: params.insuranceProviders,
        candidates: params.candidates.map((c) => ({
          hospital_id: c.hospitalId,
          name: c.name,
          latitude: c.latitude,
          longitude: c.longitude,
          specialties: c.specialties,
          available_beds: c.availableBeds,
          total_beds: c.totalBeds,
          available_doctors: c.availableDoctors,
          total_doctors: c.totalDoctors,
          queue_load: c.queueLoad,
          reliability_score: c.reliabilityScore,
          accepted_insurance_providers: c.acceptedInsuranceProviders,
        })),
      }),
    });

    if (!res.ok) {
      throw new Error(`AI service hospital ranking failed (${res.status})`);
    }

    const body = (await res.json()) as Array<{
      hospital_id: string;
      name: string;
      score: number;
      eta_minutes: number;
      wait_time_minutes: number;
      breakdown: HospitalScoreBreakdown;
      explanation: string;
    }>;

    return body.map((r) => ({
      hospitalId: r.hospital_id,
      name: r.name,
      score: r.score,
      etaMinutes: r.eta_minutes,
      waitTimeMinutes: r.wait_time_minutes,
      breakdown: r.breakdown,
      explanation: r.explanation,
    }));
  }
}
