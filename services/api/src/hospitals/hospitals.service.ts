import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import {
  HOSPITAL_SCORING_CLIENT,
  type HospitalScoringCandidate,
  type HospitalScoringClient,
} from './hospital-scoring-client';
import { RecommendHospitalsDto } from './dto/recommend-hospitals.dto';
import { UpdateOperationalStatusDto } from './dto/update-operational-status.dto';

@Injectable()
export class HospitalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patients: PatientsService,
    @Inject(HOSPITAL_SCORING_CLIENT)
    private readonly hospitalScoringClient: HospitalScoringClient,
  ) {}

  async search(city?: string, specializationId?: number) {
    const hospitals = await this.prisma.hospitals.findMany({
      where: {
        ...(city ? { city: { equals: city, mode: 'insensitive' } } : {}),
        ...(specializationId
          ? { specialties: { some: { specialization_id: specializationId } } }
          : {}),
      },
      include: {
        operational_status: true,
        specialties: { include: { doctor_specializations: true } },
      },
      orderBy: { name: 'asc' },
    });
    return hospitals.map(toHospitalSummary);
  }

  async getById(hospitalId: string) {
    const hospital = await this.prisma.hospitals.findUnique({
      where: { id: hospitalId },
      include: {
        operational_status: true,
        specialties: { include: { doctor_specializations: true } },
        departments: true,
      },
    });
    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }
    return toHospitalDetail(hospital);
  }

  async getStatus(hospitalId: string) {
    const status = await this.prisma.hospital_operational_status.findUnique({
      where: { hospital_id: hospitalId },
    });
    if (!status) {
      throw new NotFoundException('No operational status on file for this hospital');
    }
    return toStatusResponse(status);
  }

  async updateStatus(hospitalId: string, dto: UpdateOperationalStatusDto) {
    const hospital = await this.prisma.hospitals.findUnique({
      where: { id: hospitalId },
    });
    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    const status = await this.prisma.hospital_operational_status.upsert({
      where: { hospital_id: hospitalId },
      update: {
        ...(dto.availableBeds !== undefined && { available_beds: dto.availableBeds }),
        ...(dto.totalBeds !== undefined && { total_beds: dto.totalBeds }),
        ...(dto.availableIcu !== undefined && { available_icu: dto.availableIcu }),
        ...(dto.totalIcu !== undefined && { total_icu: dto.totalIcu }),
        ...(dto.availableDoctors !== undefined && { available_doctors: dto.availableDoctors }),
        ...(dto.totalDoctors !== undefined && { total_doctors: dto.totalDoctors }),
        ...(dto.emergencyLoad !== undefined && { emergency_load: dto.emergencyLoad }),
        ...(dto.queueLoad !== undefined && { queue_load: dto.queueLoad }),
        ...(dto.ventilatorsAvailable !== undefined && {
          ventilators_available: dto.ventilatorsAvailable,
        }),
      },
      create: {
        hospital_id: hospitalId,
        available_beds: dto.availableBeds ?? 0,
        total_beds: dto.totalBeds ?? 0,
        available_icu: dto.availableIcu ?? 0,
        total_icu: dto.totalIcu ?? 0,
        available_doctors: dto.availableDoctors ?? 0,
        total_doctors: dto.totalDoctors ?? 0,
        emergency_load: dto.emergencyLoad ?? 0,
        queue_load: dto.queueLoad ?? 0,
        ventilators_available: dto.ventilatorsAvailable ?? 0,
      },
    });
    return toStatusResponse(status);
  }

  async recommend(userId: string, dto: RecommendHospitalsDto) {
    const patientId = await this.patients.getPatientIdForUser(userId);
    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId },
      include: { address: true, insurances: true },
    });

    let patientLat = dto.patientLat;
    let patientLng = dto.patientLng;
    if (patientLat === undefined || patientLng === undefined) {
      const addrLat = patient?.address?.latitude;
      const addrLng = patient?.address?.longitude;
      if (addrLat == null || addrLng == null) {
        throw new BadRequestException(
          'No location available — provide patientLat/patientLng or set your address with coordinates first',
        );
      }
      patientLat = Number(addrLat);
      patientLng = Number(addrLng);
    }

    let urgencyLevel: string | null = null;
    if (dto.triageSessionId) {
      const session = await this.prisma.triage_sessions.findUnique({
        where: { id: dto.triageSessionId },
      });
      if (!session || session.patient_id !== patientId) {
        throw new NotFoundException('Triage session not found');
      }
      urgencyLevel = session.urgency_level;
    }

    let requiredSpecializationName: string | undefined;
    if (dto.requiredSpecializationId) {
      const spec = await this.prisma.doctor_specializations.findUnique({
        where: { id: dto.requiredSpecializationId },
      });
      if (!spec) {
        throw new BadRequestException('Unknown specialization id');
      }
      requiredSpecializationName = spec.specialization_name;
    }

    const hospitals = await this.prisma.hospitals.findMany({
      where: urgencyLevel === 'EMERGENCY' ? { emergency_supported: true } : undefined,
      include: {
        operational_status: true,
        specialties: { include: { doctor_specializations: true } },
      },
    });
    if (hospitals.length === 0) {
      return [];
    }

    const candidates: HospitalScoringCandidate[] = hospitals.map((h) => ({
      hospitalId: h.id,
      name: h.name,
      latitude: Number(h.latitude),
      longitude: Number(h.longitude),
      specialties: h.specialties.map((s) => s.doctor_specializations.specialization_name),
      availableBeds: h.operational_status?.available_beds ?? 0,
      totalBeds: h.operational_status?.total_beds ?? 0,
      availableDoctors: h.operational_status?.available_doctors ?? 0,
      totalDoctors: h.operational_status?.total_doctors ?? 0,
      queueLoad: h.operational_status?.queue_load ?? 0,
      reliabilityScore: Number(h.reliability_score),
      acceptedInsuranceProviders: h.accepted_insurance_providers,
    }));

    const results = await this.hospitalScoringClient.rank({
      patientLatitude: patientLat,
      patientLongitude: patientLng,
      requiredSpecialization: requiredSpecializationName,
      insuranceProviders: (patient?.insurances ?? []).map((i) => i.provider_name),
      candidates,
    });

    const topResults = results.slice(0, dto.maxResults ?? 5);
    const hospitalById = new Map(hospitals.map((h) => [h.id, h]));

    const saved = await Promise.all(
      topResults.map((r) =>
        this.prisma.hospital_recommendations.create({
          data: {
            patient_id: patientId,
            triage_session_id: dto.triageSessionId,
            hospital_id: r.hospitalId,
            recommendation_score: r.score,
            eta_minutes: r.etaMinutes,
            wait_time_minutes: r.waitTimeMinutes,
            recommendation_reason: r.explanation,
          },
        }),
      ),
    );

    return topResults.map((r, i) => {
      const h = hospitalById.get(r.hospitalId);
      return {
        recommendationId: saved[i].id,
        hospitalId: r.hospitalId,
        name: r.name,
        hospitalType: h?.hospital_type,
        city: h?.city,
        emergencySupported: h?.emergency_supported,
        score: r.score,
        etaMinutes: r.etaMinutes,
        waitTimeMinutes: r.waitTimeMinutes,
        breakdown: r.breakdown,
        explanation: r.explanation,
      };
    });
  }

  async getRecommendationsForSession(userId: string, sessionId: string) {
    const patientId = await this.patients.getPatientIdForUser(userId);
    const session = await this.prisma.triage_sessions.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.patient_id !== patientId) {
      throw new NotFoundException('Triage session not found');
    }

    const recs = await this.prisma.hospital_recommendations.findMany({
      where: { triage_session_id: sessionId },
      include: { hospitals: true },
      orderBy: { recommendation_score: 'desc' },
    });

    return recs.map((r) => ({
      recommendationId: r.id,
      hospitalId: r.hospital_id,
      name: r.hospitals.name,
      hospitalType: r.hospitals.hospital_type,
      city: r.hospitals.city,
      emergencySupported: r.hospitals.emergency_supported,
      score: Number(r.recommendation_score),
      etaMinutes: r.eta_minutes,
      waitTimeMinutes: r.wait_time_minutes,
      explanation: r.recommendation_reason,
      createdAt: r.created_at,
    }));
  }

  async getExplanation(userId: string, recommendationId: string) {
    const patientId = await this.patients.getPatientIdForUser(userId);
    const rec = await this.prisma.hospital_recommendations.findUnique({
      where: { id: recommendationId },
      include: { hospitals: true },
    });
    if (!rec || rec.patient_id !== patientId) {
      throw new NotFoundException('Recommendation not found');
    }
    return {
      recommendationId: rec.id,
      hospitalId: rec.hospital_id,
      hospitalName: rec.hospitals.name,
      score: Number(rec.recommendation_score),
      etaMinutes: rec.eta_minutes,
      waitTimeMinutes: rec.wait_time_minutes,
      explanation: rec.recommendation_reason,
      createdAt: rec.created_at,
    };
  }
}

interface HospitalRow {
  id: string;
  name: string;
  hospital_type: string;
  city: string | null;
  state: string | null;
  latitude: unknown;
  longitude: unknown;
  emergency_supported: boolean;
  verified: boolean;
  reliability_score: unknown;
  accepted_insurance_providers: string[];
  operational_status: { available_beds: number; total_beds: number } | null;
  specialties: Array<{ doctor_specializations: { specialization_name: string } }>;
}

function toHospitalSummary(h: HospitalRow) {
  return {
    id: h.id,
    name: h.name,
    hospitalType: h.hospital_type,
    city: h.city,
    state: h.state,
    emergencySupported: h.emergency_supported,
    verified: h.verified,
    availableBeds: h.operational_status?.available_beds ?? null,
    totalBeds: h.operational_status?.total_beds ?? null,
    specialties: h.specialties.map((s) => s.doctor_specializations.specialization_name),
  };
}

function toHospitalDetail(
  h: HospitalRow & {
    address_line_1: string | null;
    contact_number: string | null;
    departments: Array<{ id: string; department_name: string; description: string | null }>;
  },
) {
  return {
    id: h.id,
    name: h.name,
    hospitalType: h.hospital_type,
    addressLine1: h.address_line_1,
    city: h.city,
    state: h.state,
    latitude: Number(h.latitude),
    longitude: Number(h.longitude),
    contactNumber: h.contact_number,
    emergencySupported: h.emergency_supported,
    verified: h.verified,
    reliabilityScore: Number(h.reliability_score),
    specialties: h.specialties.map((s) => s.doctor_specializations.specialization_name),
    departments: h.departments.map((d) => ({
      id: d.id,
      departmentName: d.department_name,
      description: d.description,
    })),
    operationalStatus: h.operational_status ? toStatusResponse(h.operational_status as StatusRow) : null,
  };
}

interface StatusRow {
  available_beds: number;
  total_beds: number;
  available_icu: number;
  total_icu: number;
  available_doctors: number;
  total_doctors: number;
  emergency_load: number;
  queue_load: number;
  ventilators_available: number;
  updated_at: Date;
}

function toStatusResponse(s: StatusRow) {
  return {
    availableBeds: s.available_beds,
    totalBeds: s.total_beds,
    availableIcu: s.available_icu,
    totalIcu: s.total_icu,
    availableDoctors: s.available_doctors,
    totalDoctors: s.total_doctors,
    emergencyLoad: s.emergency_load,
    queueLoad: s.queue_load,
    ventilatorsAvailable: s.ventilators_available,
    updatedAt: s.updated_at,
  };
}
