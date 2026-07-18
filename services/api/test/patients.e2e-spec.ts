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

describe('PatientsController (e2e)', () => {
  let app: INestApplication<App>;

  const mockPrisma = createMockPrismaService();
  const mockStorage = createMockStorageService();

  const fakeVerifier = { verify: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

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

  describe('GET /api/v1/patients/me', () => {
    it('rejects requests with no bearer token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/patients/me')
        .expect(401);
    });

    it('rejects non-patient roles', async () => {
      authAs('user-1', 'doctor');

      return request(app.getHttpServer())
        .get('/api/v1/patients/me')
        .set('Authorization', 'Bearer valid')
        .expect(403);
    });

    it('returns 404 when no patient row exists yet', async () => {
      authAs('user-1', 'patient');
      mockPrisma.patients.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .get('/api/v1/patients/me')
        .set('Authorization', 'Bearer valid')
        .expect(404);
    });

    it('returns the mapped profile for a provisioned patient', async () => {
      authAs('user-1', 'patient');
      mockPrisma.patients.findUnique.mockResolvedValue({
        id: 'patient-1',
        first_name: 'Ada',
        last_name: 'Lovelace',
        date_of_birth: null,
        gender: null,
        blood_group: 'UNKNOWN',
        height_cm: null,
        weight_kg: null,
        profile_photo_key: null,
        address: null,
        emergency_contacts: [],
        insurances: [],
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/patients/me')
        .set('Authorization', 'Bearer valid')
        .expect(200);

      expect(res.body).toMatchObject({
        id: 'patient-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        profilePhotoUrl: null,
      });
    });
  });

  describe('PUT /api/v1/patients/medical-history', () => {
    it('replaces the condition list within a transaction', async () => {
      authAs('user-1', 'patient');
      mockPrisma.patients.findUnique.mockResolvedValue({ id: 'patient-1' });
      mockPrisma.medical_conditions.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .put('/api/v1/patients/medical-history')
        .set('Authorization', 'Bearer valid')
        .send({ conditions: [{ conditionName: 'Asthma', status: 'ACTIVE' }] })
        .expect(200);

      expect(mockPrisma.medical_conditions.deleteMany).toHaveBeenCalledWith({
        where: { patient_id: 'patient-1' },
      });
      expect(mockPrisma.medical_conditions.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              patient_id: 'patient-1',
              condition_name: 'Asthma',
              status: 'ACTIVE',
            }),
          ],
        }),
      );
    });
  });
});
