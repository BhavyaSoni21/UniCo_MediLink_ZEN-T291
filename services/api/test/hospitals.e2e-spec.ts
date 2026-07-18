import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';
import { TOKEN_VERIFIER } from '../src/auth/token-verifier';
import { HOSPITAL_SCORING_CLIENT } from '../src/hospitals/hospital-scoring-client';
import { createMockPrismaService } from './mock-prisma';
import { createMockStorageService } from './mock-storage';

describe('HospitalsController / HospitalIntelligenceController (e2e)', () => {
  let app: INestApplication<App>;

  const mockPrisma = createMockPrismaService();
  const fakeVerifier = { verify: jest.fn() };
  const fakeHospitalScoringClient = { rank: jest.fn() };

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
      .useValue(fakeHospitalScoringClient)
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

  describe('GET /api/v1/hospitals/search', () => {
    it('rejects requests with no bearer token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/hospitals/search')
        .expect(401);
    });

    it('returns the hospital list for any authenticated role', async () => {
      authAs('user-1', 'patient');
      mockPrisma.hospitals.findMany.mockResolvedValue([
        {
          id: 'hosp-1',
          name: 'Test Hospital',
          hospital_type: 'PRIVATE',
          city: 'Rivertown',
          state: 'RT',
          emergency_supported: true,
          verified: true,
          operational_status: { available_beds: 10, total_beds: 20 },
          specialties: [{ doctor_specializations: { specialization_name: 'Cardiology' } }],
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/hospitals/search')
        .set('Authorization', 'Bearer valid')
        .expect(200);

      expect(res.body).toEqual([
        expect.objectContaining({ id: 'hosp-1', name: 'Test Hospital', availableBeds: 10 }),
      ]);
    });
  });

  describe('GET /api/v1/hospitals/:hospitalId', () => {
    it('returns 404 when the hospital does not exist', async () => {
      authAs('user-1', 'patient');
      mockPrisma.hospitals.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .get('/api/v1/hospitals/does-not-exist')
        .set('Authorization', 'Bearer valid')
        .expect(404);
    });
  });

  describe('POST /api/v1/hospitals/:hospitalId/status', () => {
    it('rejects non-hospital/admin roles', async () => {
      authAs('user-1', 'patient');

      return request(app.getHttpServer())
        .post('/api/v1/hospitals/hosp-1/status')
        .set('Authorization', 'Bearer valid')
        .send({ availableBeds: 5 })
        .expect(403);
    });

    it('allows the hospital role to update status', async () => {
      authAs('user-1', 'hospital');
      mockPrisma.hospitals.findUnique.mockResolvedValue({ id: 'hosp-1' });
      mockPrisma.hospital_operational_status.upsert.mockResolvedValue({
        available_beds: 5,
        total_beds: 20,
        available_icu: 0,
        total_icu: 0,
        available_doctors: 0,
        total_doctors: 0,
        emergency_load: 0,
        queue_load: 0,
        ventilators_available: 0,
        updated_at: new Date('2026-01-01'),
      });

      await request(app.getHttpServer())
        .post('/api/v1/hospitals/hosp-1/status')
        .set('Authorization', 'Bearer valid')
        .send({ availableBeds: 5 })
        .expect(201);

      expect(mockPrisma.hospital_operational_status.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { hospital_id: 'hosp-1' },
          update: expect.objectContaining({ available_beds: 5 }),
        }),
      );
    });
  });

  describe('POST /api/v1/hospital-intelligence/recommend', () => {
    it('returns 400 when no location is available', async () => {
      authAs('user-1', 'patient');
      mockPrisma.patients.findUnique.mockResolvedValue({
        id: 'patient-1',
        address: null,
        insurances: [],
      });

      return request(app.getHttpServer())
        .post('/api/v1/hospital-intelligence/recommend')
        .set('Authorization', 'Bearer valid')
        .send({})
        .expect(400);
    });

    it('ranks candidates via the scoring client and persists recommendations', async () => {
      authAs('user-1', 'patient');
      mockPrisma.patients.findUnique.mockResolvedValue({
        id: 'patient-1',
        address: null,
        insurances: [],
      });
      mockPrisma.hospitals.findMany.mockResolvedValue([
        {
          id: 'hosp-1',
          name: 'Test Hospital',
          hospital_type: 'PRIVATE',
          city: 'Rivertown',
          latitude: 28.61,
          longitude: 77.21,
          emergency_supported: true,
          reliability_score: 0.8,
          accepted_insurance_providers: [],
          operational_status: {
            available_beds: 10,
            total_beds: 20,
            available_doctors: 5,
            total_doctors: 10,
            queue_load: 3,
          },
          specialties: [],
        },
      ]);
      fakeHospitalScoringClient.rank.mockResolvedValue([
        {
          hospitalId: 'hosp-1',
          name: 'Test Hospital',
          score: 88.5,
          etaMinutes: 12,
          waitTimeMinutes: 24,
          breakdown: {
            specialty: 1,
            eta: 0.9,
            beds: 0.5,
            doctors: 0.5,
            queue: 0.9,
            reliability: 0.8,
            insurance: 1,
          },
          explanation: 'Score 88.5/100 — test explanation.',
        },
      ]);
      mockPrisma.hospital_recommendations.create.mockResolvedValue({ id: 'rec-1' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/hospital-intelligence/recommend')
        .set('Authorization', 'Bearer valid')
        .send({ patientLat: 28.6, patientLng: 77.2 })
        .expect(201);

      expect(fakeHospitalScoringClient.rank).toHaveBeenCalledWith(
        expect.objectContaining({ patientLatitude: 28.6, patientLongitude: 77.2 }),
      );
      expect(res.body).toEqual([
        expect.objectContaining({
          recommendationId: 'rec-1',
          hospitalId: 'hosp-1',
          score: 88.5,
        }),
      ]);
    });
  });

  describe('GET /api/v1/hospital-intelligence/explanations/:recommendationId', () => {
    it('returns 404 when the recommendation belongs to a different patient', async () => {
      authAs('user-1', 'patient');
      mockPrisma.patients.findUnique.mockResolvedValue({ id: 'patient-1' });
      mockPrisma.hospital_recommendations.findUnique.mockResolvedValue({
        id: 'rec-1',
        patient_id: 'someone-elses-patient-id',
        hospital_id: 'hosp-1',
        hospitals: { name: 'Test Hospital' },
      });

      return request(app.getHttpServer())
        .get('/api/v1/hospital-intelligence/explanations/rec-1')
        .set('Authorization', 'Bearer valid')
        .expect(404);
    });
  });
});
