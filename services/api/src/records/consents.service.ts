import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { GrantConsentDto } from './dto/grant-consent.dto';
import { RevokeConsentDto } from './dto/revoke-consent.dto';
import type { consent_grantee_type_enum } from '../../generated/prisma/enums';

export interface CreateGrantParams {
  patientId: string;
  grantedToType: string;
  grantedToId: string;
  recordId?: string | null;
}

@Injectable()
export class ConsentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patients: PatientsService,
  ) {}

  async createGrant(params: CreateGrantParams) {
    if (params.grantedToType === 'PHARMACY') {
      throw new BadRequestException(
        'Sharing with pharmacies is not available yet',
      );
    }

    const grantee = await this.prisma.users.findUnique({
      where: { id: params.grantedToId },
      include: { roles: true },
    });
    const expectedRole = params.grantedToType.toLowerCase();
    if (!grantee || !grantee.roles || grantee.roles.role_name !== expectedRole) {
      throw new BadRequestException(
        `No ${expectedRole} account found for that id`,
      );
    }

    const recordId = params.recordId ?? null;
    const existing = await this.prisma.consents.findFirst({
      where: {
        patient_id: params.patientId,
        granted_to_id: params.grantedToId,
        granted_to_type: params.grantedToType as consent_grantee_type_enum,
        record_id: recordId,
        status: 'ACTIVE',
      },
    });
    if (existing) {
      return toConsentResponse(existing);
    }

    const consent = await this.prisma.consents.create({
      data: {
        patient_id: params.patientId,
        granted_to_type: params.grantedToType as consent_grantee_type_enum,
        granted_to_id: params.grantedToId,
        record_id: recordId,
      },
    });
    return toConsentResponse(consent);
  }

  async grant(userId: string, dto: GrantConsentDto) {
    const patientId = await this.patients.getPatientIdForUser(userId);
    return this.createGrant({
      patientId,
      grantedToType: dto.grantedToType,
      grantedToId: dto.grantedToId,
      recordId: dto.recordId,
    });
  }

  async revoke(userId: string, dto: RevokeConsentDto) {
    const patientId = await this.patients.getPatientIdForUser(userId);
    const consent = await this.prisma.consents.findUnique({
      where: { id: dto.consentId },
    });
    if (!consent || consent.patient_id !== patientId) {
      throw new NotFoundException('Consent not found');
    }

    const updated = await this.prisma.consents.update({
      where: { id: dto.consentId },
      data: { status: 'REVOKED', revoked_at: new Date() },
    });
    return toConsentResponse(updated);
  }

  async list(userId: string) {
    const patientId = await this.patients.getPatientIdForUser(userId);
    const consents = await this.prisma.consents.findMany({
      where: { patient_id: patientId },
      orderBy: { granted_at: 'desc' },
    });
    return consents.map(toConsentResponse);
  }
}

function toConsentResponse(consent: {
  id: string;
  granted_to_type: string;
  granted_to_id: string;
  record_id: string | null;
  status: string;
  granted_at: Date;
  revoked_at: Date | null;
}) {
  return {
    id: consent.id,
    grantedToType: consent.granted_to_type,
    grantedToId: consent.granted_to_id,
    recordId: consent.record_id,
    status: consent.status,
    grantedAt: consent.granted_at,
    revokedAt: consent.revoked_at,
  };
}
