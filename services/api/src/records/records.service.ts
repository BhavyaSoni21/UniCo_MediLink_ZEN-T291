import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PatientsService } from '../patients/patients.service';
import { ConsentsService } from './consents.service';
import { UploadRecordDto } from './dto/upload-record.dto';
import { ShareRecordDto } from './dto/share-record.dto';
import { simulateOcr } from './ocr-simulator';
import type { record_type_enum } from '../../generated/prisma/enums';

type RecordAccess = 'OWNER' | 'ALL' | Set<string>;

@Injectable()
export class RecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly patients: PatientsService,
    private readonly consents: ConsentsService,
  ) {}

  private async resolveAccess(
    callerUserId: string,
    patientId: string,
  ): Promise<RecordAccess> {
    const own = await this.prisma.patients.findUnique({
      where: { user_id: callerUserId },
      select: { id: true },
    });
    if (own?.id === patientId) {
      return 'OWNER';
    }

    const activeConsents = await this.prisma.consents.findMany({
      where: {
        patient_id: patientId,
        granted_to_id: callerUserId,
        status: 'ACTIVE',
      },
      select: { record_id: true },
    });
    if (activeConsents.some((c) => c.record_id === null)) {
      return 'ALL';
    }
    return new Set(
      activeConsents
        .map((c) => c.record_id)
        .filter((id): id is string => id !== null),
    );
  }

  private hasAccess(access: RecordAccess, recordId: string): boolean {
    return access === 'OWNER' || access === 'ALL' || access.has(recordId);
  }

  async upload(
    userId: string,
    dto: UploadRecordDto,
    file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('A file is required');
    }

    const patientId = await this.patients.getPatientIdForUser(userId);

    const record = await this.prisma.medical_records.create({
      data: {
        patient_id: patientId,
        record_type: dto.recordType as record_type_enum | undefined,
        visit_date: dto.visitDate ? new Date(dto.visitDate) : undefined,
        summary: dto.summary,
        diagnosis: dto.diagnosis,
      },
    });

    const objectKey = this.storage.buildObjectKey(
      patientId,
      record.id,
      file.originalname,
    );
    await this.storage.putObject(objectKey, file.buffer, file.mimetype);

    const medicalFile = await this.prisma.medical_files.create({
      data: {
        medical_record_id: record.id,
        file_name: file.originalname,
        file_type: file.mimetype,
        storage_key: objectKey,
        file_size_bytes: file.size,
        ocr_text: simulateOcr(file.originalname, file.mimetype),
      },
    });

    return this.toRecordDetail(record, [medicalFile]);
  }

  async getById(userId: string, recordId: string) {
    const record = await this.prisma.medical_records.findUnique({
      where: { id: recordId },
      include: { medical_files: true },
    });
    if (!record || record.deleted_at) {
      throw new NotFoundException('Record not found');
    }

    const access = await this.resolveAccess(userId, record.patient_id);
    if (!this.hasAccess(access, recordId)) {
      throw new NotFoundException('Record not found');
    }

    await this.prisma.record_access_logs.create({
      data: {
        medical_record_id: recordId,
        accessed_by: userId,
        action: 'VIEW',
      },
    });

    return this.toRecordDetail(record, record.medical_files, true);
  }

  async listForPatient(userId: string, patientId: string) {
    const access = await this.resolveAccess(userId, patientId);
    if (access !== 'OWNER' && access !== 'ALL' && access.size === 0) {
      throw new NotFoundException('Patient not found or access denied');
    }

    const records = await this.prisma.medical_records.findMany({
      where: {
        patient_id: patientId,
        deleted_at: null,
        ...(access instanceof Set ? { id: { in: [...access] } } : {}),
      },
      include: { medical_files: true },
      orderBy: { created_at: 'desc' },
    });

    // Presigned URLs are computed locally (HMAC signing, no round-trip to
    // MinIO), so generating one per file here is cheap even for a list view.
    return Promise.all(
      records.map((r) => this.toRecordDetail(r, r.medical_files, true)),
    );
  }

  async delete(userId: string, recordId: string) {
    const record = await this.prisma.medical_records.findUnique({
      where: { id: recordId },
    });
    if (!record || record.deleted_at) {
      throw new NotFoundException('Record not found');
    }

    const patientId = await this.patients.getPatientIdForUser(userId);
    if (record.patient_id !== patientId) {
      throw new NotFoundException('Record not found');
    }

    await this.prisma.medical_records.update({
      where: { id: recordId },
      data: { deleted_at: new Date() },
    });
    await this.prisma.record_access_logs.create({
      data: {
        medical_record_id: recordId,
        accessed_by: userId,
        action: 'DELETE',
      },
    });

    return { success: true };
  }

  async share(userId: string, recordId: string, dto: ShareRecordDto) {
    const record = await this.prisma.medical_records.findUnique({
      where: { id: recordId },
    });
    if (!record || record.deleted_at) {
      throw new NotFoundException('Record not found');
    }

    const patientId = await this.patients.getPatientIdForUser(userId);
    if (record.patient_id !== patientId) {
      throw new NotFoundException('Record not found');
    }

    const consent = await this.consents.createGrant({
      patientId,
      grantedToType: dto.grantedToType,
      grantedToId: dto.grantedToId,
      recordId,
    });

    await this.prisma.record_access_logs.create({
      data: {
        medical_record_id: recordId,
        accessed_by: userId,
        action: 'SHARE',
      },
    });

    return consent;
  }

  async getAuditLog(userId: string) {
    const patientId = await this.patients.getPatientIdForUser(userId);
    const logs = await this.prisma.record_access_logs.findMany({
      where: { medical_records: { patient_id: patientId } },
      include: { medical_records: { select: { id: true, record_type: true } } },
      orderBy: { access_time: 'desc' },
    });

    return logs.map((log) => ({
      id: log.id,
      recordId: log.medical_record_id,
      recordType: log.medical_records.record_type,
      accessedBy: log.accessed_by,
      action: log.action,
      accessTime: log.access_time,
      ipAddress: log.ip_address,
    }));
  }

  private async toRecordDetail(
    record: {
      id: string;
      patient_id: string;
      doctor_id: string | null;
      record_type: string;
      visit_date: Date | null;
      summary: string | null;
      diagnosis: string | null;
      created_at: Date;
    },
    files: Array<{
      id: string;
      file_name: string;
      file_type: string;
      storage_key: string;
      file_size_bytes: number | null;
      ocr_text: string | null;
      uploaded_at: Date;
    }>,
    includeDownloadUrls = true,
  ) {
    const mappedFiles = await Promise.all(
      files.map(async (f) => ({
        id: f.id,
        fileName: f.file_name,
        fileType: f.file_type,
        fileSizeBytes: f.file_size_bytes,
        ocrText: f.ocr_text,
        uploadedAt: f.uploaded_at,
        downloadUrl: includeDownloadUrls
          ? await this.storage.getPresignedUrl(f.storage_key)
          : undefined,
      })),
    );

    return {
      id: record.id,
      patientId: record.patient_id,
      doctorId: record.doctor_id,
      recordType: record.record_type,
      visitDate: record.visit_date,
      summary: record.summary,
      diagnosis: record.diagnosis,
      createdAt: record.created_at,
      files: mappedFiles,
    };
  }
}
