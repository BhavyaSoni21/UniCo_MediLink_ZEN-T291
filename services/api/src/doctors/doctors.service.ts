import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSpecializations() {
    const specializations = await this.prisma.doctor_specializations.findMany({
      orderBy: { specialization_name: 'asc' },
    });
    return specializations.map((s) => ({ id: s.id, name: s.specialization_name }));
  }

  async getDoctorIdForUser(userId: string): Promise<string> {
    const doctor = await this.prisma.doctors.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });
    if (!doctor) {
      throw new NotFoundException(
        'No doctor profile yet — call complete-profile first',
      );
    }
    return doctor.id;
  }

  async search(specializationId?: number, hospitalId?: string) {
    const doctors = await this.prisma.doctors.findMany({
      where: {
        availability_status: true,
        ...(specializationId ? { specialization_id: specializationId } : {}),
        ...(hospitalId ? { hospital_id: hospitalId } : {}),
      },
      include: {
        users: true,
        hospitals: true,
        doctor_specializations: true,
      },
      orderBy: { experience_years: 'desc' },
    });
    return doctors.map(toDoctorSummary);
  }

  async getById(doctorId: string) {
    const doctor = await this.prisma.doctors.findUnique({
      where: { id: doctorId },
      include: {
        users: true,
        hospitals: true,
        doctor_specializations: true,
        schedules: true,
      },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }
    return toDoctorDetail(doctor);
  }

  async getMe(userId: string) {
    const doctorId = await this.getDoctorIdForUser(userId);
    return this.getById(doctorId);
  }

  async updateMe(userId: string, dto: UpdateDoctorProfileDto) {
    const doctorId = await this.getDoctorIdForUser(userId);

    if (dto.hospitalId) {
      const hospital = await this.prisma.hospitals.findUnique({
        where: { id: dto.hospitalId },
      });
      if (!hospital) {
        throw new NotFoundException('Hospital not found');
      }
    }

    await this.prisma.doctors.update({
      where: { id: doctorId },
      data: {
        ...(dto.hospitalId !== undefined && { hospital_id: dto.hospitalId }),
        ...(dto.specializationId !== undefined && {
          specialization_id: dto.specializationId,
        }),
        ...(dto.licenseNumber !== undefined && {
          license_number: dto.licenseNumber,
        }),
        ...(dto.experienceYears !== undefined && {
          experience_years: dto.experienceYears,
        }),
        ...(dto.consultationFee !== undefined && {
          consultation_fee: dto.consultationFee,
        }),
        ...(dto.availabilityStatus !== undefined && {
          availability_status: dto.availabilityStatus,
        }),
      },
    });

    return this.getById(doctorId);
  }

  async updateSchedule(userId: string, dto: UpdateScheduleDto) {
    const doctorId = await this.getDoctorIdForUser(userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.doctor_schedules.deleteMany({ where: { doctor_id: doctorId } });
      if (dto.schedule.length > 0) {
        await tx.doctor_schedules.createMany({
          data: dto.schedule.map((s) => ({
            doctor_id: doctorId,
            day_of_week: s.dayOfWeek,
            start_time: s.startTime,
            end_time: s.endTime,
            slot_duration_minutes: s.slotDurationMinutes ?? 15,
          })),
        });
      }
    });

    return this.getById(doctorId);
  }
}

interface DoctorRow {
  id: string;
  license_number: string | null;
  experience_years: number | null;
  consultation_fee: unknown;
  availability_status: boolean;
  users: { id: string; name: string | null; email: string | null };
  hospitals: { id: string; name: string; city: string | null } | null;
  doctor_specializations: { id: number; specialization_name: string } | null;
}

function toDoctorSummary(d: DoctorRow) {
  return {
    id: d.id,
    name: d.users.name,
    hospitalId: d.hospitals?.id ?? null,
    hospitalName: d.hospitals?.name ?? null,
    city: d.hospitals?.city ?? null,
    specialization: d.doctor_specializations?.specialization_name ?? null,
    experienceYears: d.experience_years,
    consultationFee: d.consultation_fee !== null ? Number(d.consultation_fee) : null,
  };
}

function toDoctorDetail(
  d: DoctorRow & {
    schedules: Array<{
      id: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      slot_duration_minutes: number;
    }>;
  },
) {
  return {
    ...toDoctorSummary(d),
    email: d.users.email,
    licenseNumber: d.license_number,
    availabilityStatus: d.availability_status,
    schedule: d.schedules.map((s) => ({
      id: s.id,
      dayOfWeek: s.day_of_week,
      startTime: s.start_time,
      endTime: s.end_time,
      slotDurationMinutes: s.slot_duration_minutes,
    })),
  };
}
