export interface RecordFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number | null;
  ocrText: string | null;
  uploadedAt: string;
  downloadUrl?: string;
}

export interface MedicalRecordDetail {
  id: string;
  patientId: string;
  doctorId: string | null;
  recordType: string;
  visitDate: string | null;
  summary: string | null;
  diagnosis: string | null;
  createdAt: string;
  files: RecordFile[];
}

export interface Consent {
  id: string;
  grantedToType: string;
  grantedToId: string;
  recordId: string | null;
  status: string;
  grantedAt: string;
  revokedAt: string | null;
}
