export interface Appointment {
  id: string;
  appointmentDate: string;
  appointmentType: string;
  appointmentStatus: string;
  priorityLevel: string;
  patientId: string;
  patientName: string | null;
  doctorId: string;
  doctorName: string | null;
  hospitalId: string;
  hospitalName: string;
  city: string | null;
  departmentId: string | null;
  departmentName: string | null;
  queue: {
    status: string;
    lastKnownPosition: number;
    estimatedWaitMinutes: number;
  } | null;
}
