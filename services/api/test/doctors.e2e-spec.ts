import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';
import { TOKEN_VERIFIER } from '../src/auth/token-verifier';
import { HOSPITAL_SCORING_CLIENT } from '../src/hospitals/hospital-scoring-client';
import { RISK_SCORING_CLIENT } from '../src/triage/risk-scoring-client';
import { createMockPrismaService } from './mock-prisma';
import { createMockStorageService } from './mock-storage';

describe('DoctorsController (e2e)', () => {
  let app: INestApplication<App>;

  const mockPrisma = createMockPrismaService();
  const fakeVerifier = { verify: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(StorageService)
      .useValue(createMockStorageService())
      .overrideProvider(TOKEN_VERIFIER)
      .useValue(fakeVerifier)
      .overrideProvider(HOSPITAL_SCORING_CLIENT)
      .useValue({ rank: jest.fn() })
      .overrideProvider(RISK_SCORING_CLIENT)
      .useValue({ evaluate: jest.fn() })
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
    fakeVerifier.verify.mockResolvedValue({ sub: userId, email: 'a@example.com' });
    mockPrisma.users.findUnique.mockResolvedValue({
      id: userId,
      roles: { role_name: role },
    });
  }

  const doctorRow = {
    id: 'doctor-1',
    license_number: null,
    experience_years: null,
    consultation_fee: null,
    availability_status: true,
    users: { id: 'user-1', name: 'Dr Test', email: 'doc@example.com' },
    hospitals: null,
    doctor_specializations: null,
    schedules: [],
  };

  describe('GET /api/v1/doctors/search', () => {
    it('rejects requests with no bearer token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/doctors/search')
        .expect(401);
    });

    it('returns the doctor list for any authenticated role', async () => {
      authAs('user-1', 'patient');
      mockPrisma.doctors.findMany.mockResolvedValue([doctorRow]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/doctors/search')
        .set('Authorization', 'Bearer valid')
        .expect(200);

      expect(res.body).toEqual([expect.objectContaining({ id: 'doctor-1', name: 'Dr Test' })]);
    });
  });

  describe('GET /api/v1/doctors/me', () => {
    it('rejects non-doctor roles', async () => {
      authAs('user-1', 'patient');

      return request(app.getHttpServer())
        .get('/api/v1/doctors/me')
        .set('Authorization', 'Bearer valid')
        .expect(403);
    });

    it('returns the bare JIT-provisioned profile for a new doctor', async () => {
      authAs('user-1', 'doctor');
      mockPrisma.doctors.findUnique.mockResolvedValue(doctorRow);

      const res = await request(app.getHttpServer())
        .get('/api/v1/doctors/me')
        .set('Authorization', 'Bearer valid')
        .expect(200);

      expect(res.body).toMatchObject({ id: 'doctor-1', hospitalId: null, specialization: null });
    });
  });

  const VALID_HOSPITAL_ID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';

  describe('PUT /api/v1/doctors/me', () => {
    it('rejects an unknown hospital id', async () => {
      authAs('user-1', 'doctor');
      mockPrisma.doctors.findUnique.mockResolvedValue(doctorRow);
      mockPrisma.hospitals.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .put('/api/v1/doctors/me')
        .set('Authorization', 'Bearer valid')
        .send({ hospitalId: VALID_HOSPITAL_ID })
        .expect(404);
    });

    it('updates profile fields', async () => {
      authAs('user-1', 'doctor');
      mockPrisma.doctors.findUnique.mockResolvedValue(doctorRow);
      mockPrisma.hospitals.findUnique.mockResolvedValue({ id: VALID_HOSPITAL_ID });

      await request(app.getHttpServer())
        .put('/api/v1/doctors/me')
        .set('Authorization', 'Bearer valid')
        .send({ hospitalId: VALID_HOSPITAL_ID, experienceYears: 5 })
        .expect(200);

      expect(mockPrisma.doctors.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'doctor-1' },
          data: expect.objectContaining({ experience_years: 5 }),
        }),
      );
    });
  });

  describe('PUT /api/v1/doctors/me/schedule', () => {
    it('replaces the schedule within a transaction', async () => {
      authAs('user-1', 'doctor');
      mockPrisma.doctors.findUnique.mockResolvedValue(doctorRow);

      await request(app.getHttpServer())
        .put('/api/v1/doctors/me/schedule')
        .set('Authorization', 'Bearer valid')
        .send({ schedule: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }] })
        .expect(200);

      expect(mockPrisma.doctor_schedules.deleteMany).toHaveBeenCalledWith({
        where: { doctor_id: 'doctor-1' },
      });
      expect(mockPrisma.doctor_schedules.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ doctor_id: 'doctor-1', day_of_week: 1 })],
        }),
      );
    });
  });

  describe('GET /api/v1/doctors/:doctorId', () => {
    it('returns 404 when the doctor does not exist', async () => {
      authAs('user-1', 'patient');
      mockPrisma.doctors.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .get('/api/v1/doctors/does-not-exist')
        .set('Authorization', 'Bearer valid')
        .expect(404);
    });
  });
});
