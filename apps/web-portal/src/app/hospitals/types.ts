export interface HospitalSummary {
  id: string;
  name: string;
  hospitalType: string;
  city: string | null;
  state: string | null;
  emergencySupported: boolean;
  verified: boolean;
  availableBeds: number | null;
  totalBeds: number | null;
  specialties: string[];
}

export interface HospitalDetail {
  id: string;
  name: string;
  hospitalType: string;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
  contactNumber: string | null;
  emergencySupported: boolean;
  verified: boolean;
  reliabilityScore: number;
  specialties: string[];
  departments: Array<{ id: string; departmentName: string; description: string | null }>;
  operationalStatus: {
    availableBeds: number;
    totalBeds: number;
    availableIcu: number;
    totalIcu: number;
    availableDoctors: number;
    totalDoctors: number;
    emergencyLoad: number;
    queueLoad: number;
    ventilatorsAvailable: number;
    updatedAt: string;
  } | null;
}

export interface HospitalRecommendation {
  recommendationId: string;
  hospitalId: string;
  name: string;
  hospitalType: string;
  city: string | null;
  emergencySupported: boolean;
  score: number;
  etaMinutes: number;
  waitTimeMinutes: number;
  explanation: string;
  breakdown?: {
    specialty: number;
    eta: number;
    beds: number;
    doctors: number;
    queue: number;
    reliability: number;
    insurance: number;
  };
}
