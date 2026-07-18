export interface Symptom {
  id: string;
  symptomName: string;
  severity: number;
  duration: string | null;
}

export interface VitalsReading {
  id: string;
  sourceType: string;
  heartRate: number | null;
  spo2: number | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  temperature: number | null;
  respiratoryRate: number | null;
  recordedAt: string;
}

export interface TriageSession {
  id: string;
  status: string;
  symptomsSummary: string | null;
  riskScore: number | null;
  urgencyLevel: string | null;
  careLevel: string | null;
  aiExplanation: string | null;
  createdAt: string;
  symptoms: Symptom[];
  vitalsReadings: VitalsReading[];
  redFlags?: string[];
}
