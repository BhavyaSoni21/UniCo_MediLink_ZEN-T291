export interface Specialization {
  id: number;
  name: string;
}

export interface DoctorSummary {
  id: string;
  name: string | null;
  hospitalId: string | null;
  hospitalName: string | null;
  city: string | null;
  specialization: string | null;
  experienceYears: number | null;
  consultationFee: number | null;
}

export interface DoctorScheduleSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

export interface DoctorDetail extends DoctorSummary {
  email: string | null;
  licenseNumber: string | null;
  availabilityStatus: boolean;
  schedule: DoctorScheduleSlot[];
}
