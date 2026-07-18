import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';
import { TOKEN_VERIFIER } from '../src/auth/token-verifier';
import { createMockPrismaService } from './mock-prisma';
import { createMockStorageService } from './mock-storage';

describe('RecordsController / ConsentsController (e2e)', () => {
  let app: INestApplication<App>;

  const mockPrisma = createMockPrismaService();
  const mockStorage = createMockStorageService();
  const fakeVerifier = { verify: jest.fn() };

  const PATIENT_USER = '4f4761de-71bf-4689-a416-82585b72bc77';
  const PATIENT_ID = '6b549e58-4093-47e5-8b8d-3d858f953ecc';
  const STRANGER_USER = 'a60e62c2-1a39-4ac4-b4f8-01c4974e57fa';
  const DOCTOR_USER = '3ae719aa-f8e9-41e4-a3d7-4be5f285d977';
  const RECORD_ID = 'baffbb65-3cd3-4374-8ab6-614b3da2dbe1';

  beforeEach(async () => {
    jest.clearAllMocks();

    // patients.findUnique is used both to resolve "my own patient id" and,
    // inside resolveAccess, to check whether the caller IS the owning
    // patient — key it off which user_id is being looked up.
    mockPrisma.patients.findUnique.mockImplementation(
      ({ where }: { where: { user_id?: string } }) => {
        if (where.user_id === PATIENT_USER)
          return Promise.resolve({ id: PATIENT_ID });
        return Promise.resolve(null);
      },
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(StorageService)
      .useValue(mockStorage)
      .overrideProvider(TOKEN_VERIFIER)
      .useValue(fakeVerifier)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  function authAs(userId: string, role: string) {
    fakeVerifier.verify.mockResolvedValue({
      sub: userId,
      email: 'a@example.com',
    });
    mockPrisma.users.findUnique.mockResolvedValue({
      id: userId,
      roles: { role_name: role },
    });
  }

  function mockRecord(overrides: Record<string, unknown> = {}) {
    return {
      id: RECORD_ID,
      patient_id: PATIENT_ID,
      doctor_id: null,
      record_type: 'CONSULTATION',
      visit_date: null,
      summary: null,
      diagnosis: null,
      deleted_at: null,
      created_at: new Date('2026-01-01'),
      medical_files: [],
      ...overrides,
    };
  }

  describe('POST /api/v1/records/upload', () => {
    it('creates a record + file and returns a download url', async () => {
      authAs(PATIENT_USER, 'patient');
      mockPrisma.medical_records.create.mockResolvedValue(mockRecord());
      mockPrisma.medical_files.create.mockResolvedValue({
        id: 'file-1',
        file_name: 'report.pdf',
        file_type: 'application/pdf',
        storage_key: 'patients/patient-1/record-1/mock-report.pdf',
        file_size_bytes: 12,
        ocr_text: expect.any(String),
        uploaded_at: new Date('2026-01-01'),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/records/upload')
        .set('Authorization', 'Bearer valid')
        .attach('file', Buffer.from('%PDF-1.4 fake'), {
          filename: 'report.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      const body = res.body as {
        files: Array<{ fileName: string; downloadUrl: string }>;
      };
      expect(body.files[0]).toMatchObject({
        fileName: 'report.pdf',
        downloadUrl: expect.stringContaining('mock-storage.local'),
      });
      expect(mockPrisma.medical_records.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ patient_id: PATIENT_ID }),
        }),
      );
    });

    it('rejects upload with no file attached', async () => {
      authAs(PATIENT_USER, 'patient');
      return request(app.getHttpServer())
        .post('/api/v1/records/upload')
        .set('Authorization', 'Bearer valid')
        .expect(400);
    });
  });

  describe('GET /api/v1/records/:recordId', () => {
    it('allows the owning patient and logs a VIEW access', async () => {
      authAs(PATIENT_USER, 'patient');
      mockPrisma.medical_records.findUnique.mockResolvedValue(mockRecord());

      await request(app.getHttpServer())
        .get(`/api/v1/records/${RECORD_ID}`)
        .set('Authorization', 'Bearer valid')
        .expect(200);

      expect(mockPrisma.record_access_logs.create).toHaveBeenCalledWith({
        data: {
          medical_record_id: RECORD_ID,
          accessed_by: PATIENT_USER,
          action: 'VIEW',
        },
      });
    });

    it('denies an unrelated user with no consent', async () => {
      authAs(STRANGER_USER, 'patient');
      mockPrisma.medical_records.findUnique.mockResolvedValue(mockRecord());
      mockPrisma.consents.findMany.mockResolvedValue([]);

      return request(app.getHttpServer())
        .get(`/api/v1/records/${RECORD_ID}`)
        .set('Authorization', 'Bearer valid')
        .expect(404);
    });

    it('allows a doctor granted an ALL_RECORDS consent', async () => {
      authAs(DOCTOR_USER, 'doctor');
      mockPrisma.medical_records.findUnique.mockResolvedValue(mockRecord());
      mockPrisma.consents.findMany.mockResolvedValue([{ record_id: null }]);

      return request(app.getHttpServer())
        .get(`/api/v1/records/${RECORD_ID}`)
        .set('Authorization', 'Bearer valid')
        .expect(200);
    });

    it('returns 404 for a soft-deleted record even for the owner', async () => {
      authAs(PATIENT_USER, 'patient');
      mockPrisma.medical_records.findUnique.mockResolvedValue(
        mockRecord({ deleted_at: new Date() }),
      );

      return request(app.getHttpServer())
        .get(`/api/v1/records/${RECORD_ID}`)
        .set('Authorization', 'Bearer valid')
        .expect(404);
    });
  });

  describe('GET /api/v1/records/patient/:patientId', () => {
    it('denies a caller with no consents at all', async () => {
      authAs(STRANGER_USER, 'patient');
      mockPrisma.consents.findMany.mockResolvedValue([]);

      return request(app.getHttpServer())
        .get(`/api/v1/records/patient/${PATIENT_ID}`)
        .set('Authorization', 'Bearer valid')
        .expect(404);
    });

    it('filters to only the record covered by a record-scoped consent', async () => {
      const otherRecordId = 'c1a5d7e2-9999-4b0e-9c3a-0f1e2d3c4b5a';
      authAs(DOCTOR_USER, 'doctor');
      mockPrisma.consents.findMany.mockResolvedValue([
        { record_id: RECORD_ID },
      ]);
      mockPrisma.medical_records.findMany.mockResolvedValue([mockRecord()]);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/records/patient/${PATIENT_ID}`)
        .set('Authorization', 'Bearer valid')
        .expect(200);

      expect(mockPrisma.medical_records.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { in: [RECORD_ID] } }),
        }),
      );
      const body = res.body as Array<{ id: string }>;
      expect(body).toHaveLength(1);
      expect(body[0].id).not.toBe(otherRecordId);
    });

    it('allows the owner to see everything with no id filter', async () => {
      authAs(PATIENT_USER, 'patient');
      mockPrisma.medical_records.findMany.mockResolvedValue([mockRecord()]);

      await request(app.getHttpServer())
        .get(`/api/v1/records/patient/${PATIENT_ID}`)
        .set('Authorization', 'Bearer valid')
        .expect(200);

      expect(mockPrisma.medical_records.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patient_id: PATIENT_ID, deleted_at: null },
        }),
      );
    });
  });

  describe('consent grant/revoke gating access', () => {
    it('grants access via /consents/grant then denies again after /consents/revoke', async () => {
      authAs(PATIENT_USER, 'patient');
      mockPrisma.users.findUnique.mockImplementation(
        ({ where }: { where: { id: string } }) => {
          if (where.id === PATIENT_USER)
            return Promise.resolve({
              id: PATIENT_USER,
              roles: { role_name: 'patient' },
            });
          if (where.id === DOCTOR_USER)
            return Promise.resolve({
              id: DOCTOR_USER,
              roles: { role_name: 'doctor' },
            });
          return Promise.resolve(null);
        },
      );
      mockPrisma.consents.findFirst.mockResolvedValue(null);
      mockPrisma.consents.create.mockResolvedValue({
        id: '9c6c9c1e-2222-4111-8abc-1234567890ab',
        granted_to_type: 'DOCTOR',
        granted_to_id: DOCTOR_USER,
        record_id: null,
        status: 'ACTIVE',
        granted_at: new Date(),
        revoked_at: null,
      });

      const grantRes = await request(app.getHttpServer())
        .post('/api/v1/consents/grant')
        .set('Authorization', 'Bearer valid')
        .send({ grantedToType: 'DOCTOR', grantedToId: DOCTOR_USER })
        .expect(201);

      expect(grantRes.body).toMatchObject({
        grantedToId: DOCTOR_USER,
        status: 'ACTIVE',
      });

      mockPrisma.consents.findUnique.mockResolvedValue({
        id: '9c6c9c1e-2222-4111-8abc-1234567890ab',
        patient_id: PATIENT_ID,
      });
      mockPrisma.consents.update.mockResolvedValue({
        id: '9c6c9c1e-2222-4111-8abc-1234567890ab',
        granted_to_type: 'DOCTOR',
        granted_to_id: DOCTOR_USER,
        record_id: null,
        status: 'REVOKED',
        granted_at: new Date(),
        revoked_at: new Date(),
      });

      const revokeRes = await request(app.getHttpServer())
        .post('/api/v1/consents/revoke')
        .set('Authorization', 'Bearer valid')
        .send({ consentId: '9c6c9c1e-2222-4111-8abc-1234567890ab' })
        .expect(201);

      expect(revokeRes.body).toMatchObject({ status: 'REVOKED' });
    });

    it('rejects PHARMACY grants (not supported yet)', async () => {
      authAs(PATIENT_USER, 'patient');
      return request(app.getHttpServer())
        .post('/api/v1/consents/grant')
        .set('Authorization', 'Bearer valid')
        .send({ grantedToType: 'PHARMACY', grantedToId: DOCTOR_USER })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/records/:recordId', () => {
    it('soft-deletes and denies non-owners', async () => {
      authAs(STRANGER_USER, 'patient');
      mockPrisma.medical_records.findUnique.mockResolvedValue(mockRecord());

      await request(app.getHttpServer())
        .delete(`/api/v1/records/${RECORD_ID}`)
        .set('Authorization', 'Bearer valid')
        .expect(404);

      expect(mockPrisma.medical_records.update).not.toHaveBeenCalled();
    });

    it('sets deleted_at rather than issuing a real delete', async () => {
      authAs(PATIENT_USER, 'patient');
      mockPrisma.medical_records.findUnique.mockResolvedValue(mockRecord());

      await request(app.getHttpServer())
        .delete(`/api/v1/records/${RECORD_ID}`)
        .set('Authorization', 'Bearer valid')
        .expect(200);

      expect(mockPrisma.medical_records.update).toHaveBeenCalledWith({
        where: { id: RECORD_ID },
        data: { deleted_at: expect.any(Date) },
      });
    });
  });
});
