export interface PatientProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string | null;
  heightCm: number | null;
  weightKg: number | null;
  profilePhotoUrl: string | null;
  address: {
    addressLine1: string;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    pincode: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  emergencyContacts: Array<{
    id: string;
    name: string;
    relationship: string | null;
    phone: string;
    email: string | null;
  }>;
  insurances: Array<{
    id: string;
    providerName: string;
    policyNumber: string;
    coverageType: string | null;
    validUntil: string | null;
  }>;
}

export interface MedicalCondition {
  id: string;
  conditionName: string;
  diagnosisDate: string | null;
  status: string;
  notes: string | null;
}

export interface Allergy {
  id: string;
  allergyName: string;
  severity: string;
  reaction: string | null;
}

export interface Medication {
  id: string;
  medicineName: string;
  dosage: string | null;
  frequency: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface TimelineEvent {
  type: string;
  date: string;
  title: string;
  detail?: string | null;
}
