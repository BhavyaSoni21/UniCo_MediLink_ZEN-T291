import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { DoctorsService } from '../doctors/doctors.service';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import type {
  appointment_status_enum,
  appointment_type_enum,
  urgency_level_enum,
} from '../../generated/prisma/enums';

const AVG_CONSULT_MINUTES = 8;
const PRIORITY_RANK: Record<string, number> = {
  EMERGENCY: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patients: PatientsService,
    private readonly doctors: DoctorsService,
  ) {}

  async getAvailability(doctorId: string, dateStr: string) {
    const doctor = await this.prisma.doctors.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const date = new Date(`${dateStr}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('date must be an ISO date (YYYY-MM-DD)');
    }
    const dayOfWeek = date.getUTCDay();

    const schedules = await this.prisma.doctor_schedules.findMany({
      where: { doctor_id: doctorId, day_of_week: dayOfWeek },
    });
    if (schedules.length === 0) {
      return [];
    }

    const dayEnd = new Date(date);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const booked = await this.prisma.appointments.findMany({
      where: {
        doctor_id: doctorId,
        appointment_date: { gte: date, lt: dayEnd },
        appointment_status: { not: 'CANCELLED' },
      },
      select: { appointment_date: true },
    });
    const bookedTimes = new Set(booked.map((a) => a.appointment_date.toISOString()));

    const slots: string[] = [];
    for (const sched of schedules) {
      const [startH, startM] = sched.start_time.split(':').map(Number);
      const [endH, endM] = sched.end_time.split(':').map(Number);
      const cursor = new Date(date);
      cursor.setUTCHours(startH, startM, 0, 0);
      const end = new Date(date);
      end.setUTCHours(endH, endM, 0, 0);

      while (cursor < end) {
        const iso = cursor.toISOString();
        if (!bookedTimes.has(iso)) {
          slots.push(iso);
        }
        cursor.setUTCMinutes(cursor.getUTCMinutes() + sched.slot_duration_minutes);
      }
    }
    return slots;
  }

  async book(userId: string, dto: BookAppointmentDto) {
    const patientId = await this.patients.getPatientIdForUser(userId);

    const doctor = await this.prisma.doctors.findUnique({
      where: { id: dto.doctorId },
    });
    if (!doctor || !doctor.hospital_id) {
      throw new BadRequestException('Doctor is not available for booking');
    }

    let priorityLevel: urgency_level_enum = 'LOW' as urgency_level_enum;
    if (dto.triageSessionId) {
      const session = await this.prisma.triage_sessions.findUnique({
        where: { id: dto.triageSessionId },
      });
      if (!session || session.patient_id !== patientId) {
        throw new NotFoundException('Triage session not found');
      }
      if (session.urgency_level) {
        priorityLevel = session.urgency_level;
      }
    }

    let appointment;
    try {
      appointment = await this.prisma.appointments.create({
        data: {
          patient_id: patientId,
          doctor_id: dto.doctorId,
          hospital_id: doctor.hospital_id,
          department_id: dto.departmentId,
          appointment_date: new Date(dto.appointmentDate),
          appointment_type: dto.appointmentType as appointment_type_enum | undefined,
          priority_level: priorityLevel,
          triage_session_id: dto.triageSessionId,
        },
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new BadRequestException(
          'That slot was just booked by someone else — pick another time',
        );
      }
      throw err;
    }

    const queueLength = await this.prisma.queue_entries.count({
      where: { status: 'WAITING', appointments: { hospital_id: doctor.hospital_id } },
    });
    await this.prisma.queue_entries.create({
      data: {
        appointment_id: appointment.id,
        queue_position: queueLength + 1,
        estimated_wait: (queueLength + 1) * AVG_CONSULT_MINUTES,
      },
    });

    return this.getById(userId, appointment.id);
  }

  async reschedule(userId: string, appointmentId: string, dto: RescheduleAppointmentDto) {
    const patientId = await this.patients.getPatientIdForUser(userId);
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment || appointment.patient_id !== patientId) {
      throw new NotFoundException('Appointment not found');
    }

    try {
      await this.prisma.appointments.update({
        where: { id: appointmentId },
        data: { appointment_date: new Date(dto.appointmentDate) },
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new BadRequestException('That slot is already booked');
      }
      throw err;
    }

    return this.getById(userId, appointmentId);
  }

  async cancel(userId: string, appointmentId: string) {
    const [patientRow, doctorRow] = await Promise.all([
      this.prisma.patients.findUnique({ where: { user_id: userId }, select: { id: true } }),
      this.prisma.doctors.findUnique({ where: { user_id: userId }, select: { id: true } }),
    ]);
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: appointmentId },
    });
    const isOwner =
      (patientRow && appointment?.patient_id === patientRow.id) ||
      (doctorRow && appointment?.doctor_id === doctorRow.id);
    if (!appointment || !isOwner) {
      throw new NotFoundException('Appointment not found');
    }

    await this.prisma.appointments.update({
      where: { id: appointmentId },
      data: { appointment_status: 'CANCELLED' },
    });
    await this.prisma.queue_entries.updateMany({
      where: { appointment_id: appointmentId },
      data: { status: 'CANCELLED' },
    });

    return { success: true };
  }

  async updateStatus(userId: string, appointmentId: string, status: appointment_status_enum) {
    const doctorId = await this.doctors.getDoctorIdForUser(userId);
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment || appointment.doctor_id !== doctorId) {
      throw new NotFoundException('Appointment not found');
    }

    await this.prisma.appointments.update({
      where: { id: appointmentId },
      data: { appointment_status: status },
    });

    const queueStatus =
      status === 'COMPLETED'
        ? 'COMPLETED'
        : status === 'CHECKED_IN'
          ? 'CALLED'
          : status === 'CANCELLED' || status === 'NO_SHOW'
            ? 'CANCELLED'
            : undefined;
    if (queueStatus) {
      await this.prisma.queue_entries.updateMany({
        where: { appointment_id: appointmentId },
        data: { status: queueStatus },
      });
    }

    return this.getById(userId, appointmentId);
  }

  async getById(userId: string, appointmentId: string) {
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: appointmentId },
      include: {
        patients: { include: { users: true } },
        doctors: { include: { users: true } },
        hospitals: true,
        departments: true,
        queue_entry: true,
      },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const [patientRow, doctorRow] = await Promise.all([
      this.prisma.patients.findUnique({ where: { user_id: userId }, select: { id: true } }),
      this.prisma.doctors.findUnique({ where: { user_id: userId }, select: { id: true } }),
    ]);
    const isOwner =
      patientRow?.id === appointment.patient_id || doctorRow?.id === appointment.doctor_id;
    if (!isOwner) {
      throw new NotFoundException('Appointment not found');
    }

    return toAppointmentResponse(appointment);
  }

  async getForPatient(userId: string) {
    const patientId = await this.patients.getPatientIdForUser(userId);
    const appointments = await this.prisma.appointments.findMany({
      where: { patient_id: patientId },
      include: {
        patients: { include: { users: true } },
        doctors: { include: { users: true } },
        hospitals: true,
        departments: true,
        queue_entry: true,
      },
      orderBy: { appointment_date: 'desc' },
    });
    return appointments.map(toAppointmentResponse);
  }

  async getForDoctor(userId: string) {
    const doctorId = await this.doctors.getDoctorIdForUser(userId);
    const appointments = await this.prisma.appointments.findMany({
      where: { doctor_id: doctorId },
      include: {
        patients: { include: { users: true } },
        doctors: { include: { users: true } },
        hospitals: true,
        departments: true,
        queue_entry: true,
      },
      orderBy: { appointment_date: 'asc' },
    });
    return appointments.map(toAppointmentResponse);
  }

  async getQueueForHospital(hospitalId: string, departmentId?: string) {
    const entries = await this.prisma.queue_entries.findMany({
      where: {
        status: { in: ['WAITING', 'CALLED'] },
        appointments: {
          hospital_id: hospitalId,
          ...(departmentId ? { department_id: departmentId } : {}),
        },
      },
      include: {
        appointments: { include: { patients: { include: { users: true } } } },
      },
    });

    entries.sort((a, b) => {
      const pa = PRIORITY_RANK[a.appointments.priority_level] ?? 0;
      const pb = PRIORITY_RANK[b.appointments.priority_level] ?? 0;
      if (pa !== pb) return pb - pa;
      return a.created_at.getTime() - b.created_at.getTime();
    });

    return entries.map((e, i) => ({
      queueEntryId: e.id,
      appointmentId: e.appointment_id,
      patientName: e.appointments.patients.users.name,
      priorityLevel: e.appointments.priority_level,
      status: e.status,
      queuePosition: i + 1,
      estimatedWaitMinutes: (i + 1) * AVG_CONSULT_MINUTES,
    }));
  }

  async getQueueStatusForAppointment(userId: string, appointmentId: string) {
    const appointment = await this.getById(userId, appointmentId);
    const queue = await this.getQueueForHospital(
      appointment.hospitalId,
      appointment.departmentId ?? undefined,
    );
    const entry = queue.find((q) => q.appointmentId === appointmentId);
    return entry ?? { inQueue: false as const };
  }
}

interface AppointmentRow {
  id: string;
  appointment_date: Date;
  appointment_type: string;
  appointment_status: string;
  priority_level: string;
  created_at: Date;
  patients: { id: string; users: { name: string | null } };
  doctors: { id: string; users: { name: string | null } };
  hospitals: { id: string; name: string; city: string | null };
  departments: { id: string; department_name: string } | null;
  queue_entry: {
    id: string;
    queue_position: number;
    estimated_wait: number;
    status: string;
  } | null;
}

function toAppointmentResponse(a: AppointmentRow) {
  return {
    id: a.id,
    appointmentDate: a.appointment_date,
    appointmentType: a.appointment_type,
    appointmentStatus: a.appointment_status,
    priorityLevel: a.priority_level,
    patientId: a.patients.id,
    patientName: a.patients.users.name,
    doctorId: a.doctors.id,
    doctorName: a.doctors.users.name,
    hospitalId: a.hospitals.id,
    hospitalName: a.hospitals.name,
    city: a.hospitals.city,
    departmentId: a.departments?.id ?? null,
    departmentName: a.departments?.department_name ?? null,
    queue: a.queue_entry
      ? {
          status: a.queue_entry.status,
          lastKnownPosition: a.queue_entry.queue_position,
          estimatedWaitMinutes: a.queue_entry.estimated_wait,
        }
      : null,
  };
}
