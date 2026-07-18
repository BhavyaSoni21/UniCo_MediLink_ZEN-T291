import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateMedicalHistoryDto } from './dto/update-medical-history.dto';
import { UpdateAllergiesDto } from './dto/update-allergies.dto';
import { UpdateMedicationsDto } from './dto/update-medications.dto';
import type {
  allergy_severity_enum,
  blood_group_enum,
  condition_status_enum,
  gender_enum,
} from '../../generated/prisma/enums';

function toNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getPatientIdForUser(userId: string): Promise<string> {
    const patient = await this.prisma.patients.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException(
        'No patient profile yet — call complete-profile first',
      );
    }
    return patient.id;
  }

  async getMe(userId: string) {
    const patient = await this.prisma.patients.findUnique({
      where: { user_id: userId },
      include: { address: true, emergency_contacts: true, insurances: true },
    });
    if (!patient) {
      throw new NotFoundException(
        'No patient profile yet — call complete-profile first',
      );
    }
    const profilePhotoUrl = patient.profile_photo_key
      ? await this.storage.getPresignedUrl(patient.profile_photo_key)
      : null;
    return { ...toProfileResponse(patient), profilePhotoUrl };
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const patientId = await this.getPatientIdForUser(userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.patients.update({
        where: { id: patientId },
        data: {
          ...(dto.firstName !== undefined && { first_name: dto.firstName }),
          ...(dto.lastName !== undefined && { last_name: dto.lastName }),
          ...(dto.dateOfBirth !== undefined && {
            date_of_birth: new Date(dto.dateOfBirth),
          }),
          ...(dto.gender !== undefined && {
            gender: dto.gender as gender_enum,
          }),
          ...(dto.bloodGroup !== undefined && {
            blood_group: dto.bloodGroup as blood_group_enum,
          }),
          ...(dto.heightCm !== undefined && { height_cm: dto.heightCm }),
          ...(dto.weightKg !== undefined && { weight_kg: dto.weightKg }),
        },
      });

      if (dto.address) {
        const address = dto.address;
        await tx.addresses.upsert({
          where: { patient_id: patientId },
          create: {
            patient_id: patientId,
            address_line_1: address.addressLine1,
            address_line_2: address.addressLine2,
            city: address.city,
            state: address.state,
            country: address.country,
            pincode: address.pincode,
            latitude: address.latitude,
            longitude: address.longitude,
          },
          update: {
            address_line_1: address.addressLine1,
            address_line_2: address.addressLine2,
            city: address.city,
            state: address.state,
            country: address.country,
            pincode: address.pincode,
            latitude: address.latitude,
            longitude: address.longitude,
          },
        });
      }

      if (dto.emergencyContacts) {
        await tx.emergency_contacts.deleteMany({
          where: { patient_id: patientId },
        });
        if (dto.emergencyContacts.length > 0) {
          await tx.emergency_contacts.createMany({
            data: dto.emergencyContacts.map((c) => ({
              patient_id: patientId,
              name: c.name,
              relationship: c.relationship,
              phone: c.phone,
              email: c.email,
            })),
          });
        }
      }

      if (dto.insurances) {
        await tx.insurances.deleteMany({ where: { patient_id: patientId } });
        if (dto.insurances.length > 0) {
          await tx.insurances.createMany({
            data: dto.insurances.map((i) => ({
              patient_id: patientId,
              provider_name: i.providerName,
              policy_number: i.policyNumber,
              coverage_type: i.coverageType,
              valid_until: i.validUntil ? new Date(i.validUntil) : undefined,
            })),
          });
        }
      }
    });

    return this.getMe(userId);
  }

  async updatePhoto(userId: string, file: Express.Multer.File) {
    const patientId = await this.getPatientIdForUser(userId);
    const objectKey = this.storage.buildObjectKey(
      patientId,
      'profile-photo',
      file.originalname,
    );
    await this.storage.putObject(objectKey, file.buffer, file.mimetype);
    await this.prisma.patients.update({
      where: { id: patientId },
      data: { profile_photo_key: objectKey },
    });
    return { profilePhotoUrl: await this.storage.getPresignedUrl(objectKey) };
  }

  async getMedicalHistory(userId: string) {
    const patientId = await this.getPatientIdForUser(userId);
    const conditions = await this.prisma.medical_conditions.findMany({
      where: { patient_id: patientId },
      orderBy: { diagnosis_date: 'desc' },
    });
    return conditions.map(toConditionResponse);
  }

  async updateMedicalHistory(userId: string, dto: UpdateMedicalHistoryDto) {
    const patientId = await this.getPatientIdForUser(userId);
    await this.prisma.$transaction(async (tx) => {
      await tx.medical_conditions.deleteMany({
        where: { patient_id: patientId },
      });
      if (dto.conditions.length > 0) {
        await tx.medical_conditions.createMany({
          data: dto.conditions.map((c) => ({
            patient_id: patientId,
            condition_name: c.conditionName,
            diagnosis_date: c.diagnosisDate
              ? new Date(c.diagnosisDate)
              : undefined,
            status: c.status as condition_status_enum | undefined,
            notes: c.notes,
          })),
        });
      }
    });
    return this.getMedicalHistory(userId);
  }

  async getAllergies(userId: string) {
    const patientId = await this.getPatientIdForUser(userId);
    const allergies = await this.prisma.allergies.findMany({
      where: { patient_id: patientId },
      orderBy: { created_at: 'desc' },
    });
    return allergies.map(toAllergyResponse);
  }

  async updateAllergies(userId: string, dto: UpdateAllergiesDto) {
    const patientId = await this.getPatientIdForUser(userId);
    await this.prisma.$transaction(async (tx) => {
      await tx.allergies.deleteMany({ where: { patient_id: patientId } });
      if (dto.allergies.length > 0) {
        await tx.allergies.createMany({
          data: dto.allergies.map((a) => ({
            patient_id: patientId,
            allergy_name: a.allergyName,
            severity: a.severity as allergy_severity_enum | undefined,
            reaction: a.reaction,
          })),
        });
      }
    });
    return this.getAllergies(userId);
  }

  async getMedications(userId: string) {
    const patientId = await this.getPatientIdForUser(userId);
    const medications = await this.prisma.medications.findMany({
      where: { patient_id: patientId },
      orderBy: { start_date: 'desc' },
    });
    return medications.map(toMedicationResponse);
  }

  async updateMedications(userId: string, dto: UpdateMedicationsDto) {
    const patientId = await this.getPatientIdForUser(userId);
    await this.prisma.$transaction(async (tx) => {
      await tx.medications.deleteMany({ where: { patient_id: patientId } });
      if (dto.medications.length > 0) {
        await tx.medications.createMany({
          data: dto.medications.map((m) => ({
            patient_id: patientId,
            medicine_name: m.medicineName,
            dosage: m.dosage,
            frequency: m.frequency,
            start_date: m.startDate ? new Date(m.startDate) : undefined,
            end_date: m.endDate ? new Date(m.endDate) : undefined,
          })),
        });
      }
    });
    return this.getMedications(userId);
  }

  async getTimeline(userId: string) {
    const patientId = await this.getPatientIdForUser(userId);
    const [conditions, medications, records, allergyList] = await Promise.all([
      this.prisma.medical_conditions.findMany({
        where: { patient_id: patientId },
      }),
      this.prisma.medications.findMany({ where: { patient_id: patientId } }),
      this.prisma.medical_records.findMany({
        where: { patient_id: patientId },
      }),
      this.prisma.allergies.findMany({ where: { patient_id: patientId } }),
    ]);

    const events = [
      ...conditions.map((c) => ({
        type: 'CONDITION' as const,
        date: (c.diagnosis_date ?? c.created_at).toISOString(),
        title: c.condition_name,
        detail: c.status,
      })),
      ...medications.map((m) => ({
        type: 'MEDICATION' as const,
        date: (m.start_date ?? m.created_at).toISOString(),
        title: m.medicine_name,
        detail: m.dosage ?? undefined,
      })),
      ...records.map((r) => ({
        type: 'RECORD' as const,
        date: (r.visit_date ?? r.created_at).toISOString(),
        title: r.diagnosis ?? r.record_type,
        detail: r.summary ?? undefined,
      })),
      ...allergyList.map((a) => ({
        type: 'ALLERGY' as const,
        date: a.created_at.toISOString(),
        title: a.allergy_name,
        detail: a.severity,
      })),
    ];

    events.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return events;
  }
}

interface PatientWithRelations {
  id: string;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: Date | null;
  gender: string | null;
  blood_group: string | null;
  height_cm: unknown;
  weight_kg: unknown;
  profile_photo_key: string | null;
  address: {
    address_line_1: string;
    address_line_2: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    pincode: string | null;
    latitude: unknown;
    longitude: unknown;
  } | null;
  emergency_contacts: Array<{
    id: string;
    name: string;
    relationship: string | null;
    phone: string;
    email: string | null;
  }>;
  insurances: Array<{
    id: string;
    provider_name: string;
    policy_number: string;
    coverage_type: string | null;
    valid_until: Date | null;
  }>;
}

function toProfileResponse(patient: PatientWithRelations) {
  return {
    id: patient.id,
    firstName: patient.first_name,
    lastName: patient.last_name,
    dateOfBirth: patient.date_of_birth,
    gender: patient.gender,
    bloodGroup: patient.blood_group,
    heightCm: toNumber(patient.height_cm),
    weightKg: toNumber(patient.weight_kg),
    address: patient.address
      ? {
          addressLine1: patient.address.address_line_1,
          addressLine2: patient.address.address_line_2,
          city: patient.address.city,
          state: patient.address.state,
          country: patient.address.country,
          pincode: patient.address.pincode,
          latitude: toNumber(patient.address.latitude),
          longitude: toNumber(patient.address.longitude),
        }
      : null,
    emergencyContacts: patient.emergency_contacts.map((c) => ({
      id: c.id,
      name: c.name,
      relationship: c.relationship,
      phone: c.phone,
      email: c.email,
    })),
    insurances: patient.insurances.map((i) => ({
      id: i.id,
      providerName: i.provider_name,
      policyNumber: i.policy_number,
      coverageType: i.coverage_type,
      validUntil: i.valid_until,
    })),
  };
}

function toConditionResponse(condition: {
  id: string;
  condition_name: string;
  diagnosis_date: Date | null;
  status: string;
  notes: string | null;
}) {
  return {
    id: condition.id,
    conditionName: condition.condition_name,
    diagnosisDate: condition.diagnosis_date,
    status: condition.status,
    notes: condition.notes,
  };
}

function toAllergyResponse(allergy: {
  id: string;
  allergy_name: string;
  severity: string;
  reaction: string | null;
}) {
  return {
    id: allergy.id,
    allergyName: allergy.allergy_name,
    severity: allergy.severity,
    reaction: allergy.reaction,
  };
}

function toMedicationResponse(medication: {
  id: string;
  medicine_name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: Date | null;
  end_date: Date | null;
}) {
  return {
    id: medication.id,
    medicineName: medication.medicine_name,
    dosage: medication.dosage,
    frequency: medication.frequency,
    startDate: medication.start_date,
    endDate: medication.end_date,
  };
}
