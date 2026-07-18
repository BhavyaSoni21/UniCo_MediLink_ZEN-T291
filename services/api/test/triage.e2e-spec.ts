import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';
import { TOKEN_VERIFIER } from '../src/auth/token-verifier';
import { RISK_SCORING_CLIENT } from '../src/triage/risk-scoring-client';
import { createMockPrismaService } from './mock-prisma';
import { createMockStorageService } from './mock-storage';

describe('TriageController (e2e)', () => {
  let app: INestApplication<App>;

  const mockPrisma = createMockPrismaService();
  const fakeVerifier = { verify: jest.fn() };
  const fakeRiskScoringClient = { evaluate: jest.fn() };

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
      .overrideProvider(RISK_SCORING_CLIENT)
      .useValue(fakeRiskScoringClient)
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

  function authAsPatient(userId: string, patientId: string) {
    fakeVerifier.verify.mockResolvedValue({ sub: userId, email: 'a@example.com' });
    mockPrisma.users.findUnique.mockResolvedValue({
      id: userId,
      roles: { role_name: 'patient' },
    });
    mockPrisma.patients.findUnique.mockResolvedValue({ id: patientId });
  }

  describe('POST /api/v1/triage/sessions', () => {
    it('rejects requests with no bearer token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/triage/sessions')
        .expect(401);
    });

    it('creates a session for the caller patient', async () => {
      authAsPatient('user-1', 'patient-1');
      mockPrisma.triage_sessions.create.mockResolvedValue({
        id: 'session-1',
        status: 'STARTED',
        symptoms_summary: null,
        risk_score: null,
        urgency_level: null,
        care_level: null,
        ai_explanation: null,
        created_at: new Date('2026-01-01'),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/triage/sessions')
        .set('Authorization', 'Bearer valid')
        .expect(201);

      expect(res.body).toMatchObject({ id: 'session-1', status: 'STARTED' });
      expect(mockPrisma.triage_sessions.create).toHaveBeenCalledWith({
        data: { patient_id: 'patient-1' },
      });
    });
  });

  describe('POST /api/v1/triage/sessions/:sessionId/symptoms', () => {
    it('returns 404 when the session belongs to a different patient', async () => {
      authAsPatient('user-1', 'patient-1');
      mockPrisma.triage_sessions.findUnique.mockResolvedValue({
        id: 'session-1',
        patient_id: 'someone-elses-patient-id',
        symptoms: [],
        vitals_readings: [],
      });

      return request(app.getHttpServer())
        .post('/api/v1/triage/sessions/session-1/symptoms')
        .set('Authorization', 'Bearer valid')
        .send({ symptoms: [{ symptomName: 'Cough', severity: 2 }] })
        .expect(404);
    });

    it('replaces the symptom list within a transaction', async () => {
      authAsPatient('user-1', 'patient-1');
      mockPrisma.triage_sessions.findUnique.mockResolvedValue({
        id: 'session-1',
        patient_id: 'patient-1',
        status: 'STARTED',
        symptoms_summary: null,
        risk_score: null,
        urgency_level: null,
        care_level: null,
        ai_explanation: null,
        created_at: new Date('2026-01-01'),
        symptoms: [],
        vitals_readings: [],
      });

      await request(app.getHttpServer())
        .post('/api/v1/triage/sessions/session-1/symptoms')
        .set('Authorization', 'Bearer valid')
        .send({
          symptoms: [{ symptomName: 'Fever', severity: 3, duration: '2 days' }],
        })
        .expect(201);

      expect(mockPrisma.symptoms.deleteMany).toHaveBeenCalledWith({
        where: { triage_session_id: 'session-1' },
      });
      expect(mockPrisma.symptoms.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              triage_session_id: 'session-1',
              symptom_name: 'Fever',
              severity: 3,
            }),
          ],
        }),
      );
    });
  });

  describe('POST /api/v1/triage/sessions/:sessionId/evaluate', () => {
    it('calls the risk scoring client and persists the result', async () => {
      authAsPatient('user-1', 'patient-1');
      const sessionRow = {
        id: 'session-1',
        patient_id: 'patient-1',
        status: 'STARTED',
        symptoms_summary: 'Fever',
        risk_score: null,
        urgency_level: null,
        care_level: null,
        ai_explanation: null,
        created_at: new Date('2026-01-01'),
        symptoms: [
          { id: 'sym-1', symptom_name: 'Fever', severity: 3, duration: null },
        ],
        vitals_readings: [
          {
            id: 'vit-1',
            source_type: 'MANUAL',
            heart_rate: 90,
            spo2: 97,
            systolic_bp: 120,
            diastolic_bp: 80,
            temperature: 38.2,
            respiratory_rate: 16,
            recorded_at: new Date('2026-01-01'),
          },
        ],
      };
      mockPrisma.triage_sessions.findUnique.mockResolvedValue(sessionRow);
      fakeRiskScoringClient.evaluate.mockResolvedValue({
        riskScore: 42,
        urgencyLevel: 'MEDIUM',
        careLevel: 'See a doctor within 1-2 days',
        explanation: 'Risk score 42/100 (MEDIUM).',
        redFlags: [],
      });
      mockPrisma.triage_sessions.update.mockResolvedValue({
        ...sessionRow,
        risk_score: 42,
        urgency_level: 'MEDIUM',
        care_level: 'See a doctor within 1-2 days',
        ai_explanation: 'Risk score 42/100 (MEDIUM).',
        status: 'COMPLETED',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/triage/sessions/session-1/evaluate')
        .set('Authorization', 'Bearer valid')
        .expect(201);

      expect(fakeRiskScoringClient.evaluate).toHaveBeenCalledWith(
        [{ symptomName: 'Fever', severity: 3, duration: null }],
        expect.objectContaining({ heartRate: 90, spo2: 97 }),
      );
      expect(res.body).toMatchObject({
        riskScore: 42,
        urgencyLevel: 'MEDIUM',
        status: 'COMPLETED',
      });
    });
  });

  describe('GET /api/v1/triage/history', () => {
    it('rejects requests with no bearer token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/triage/history')
        .expect(401);
    });

    it('lists the caller patient sessions', async () => {
      authAsPatient('user-1', 'patient-1');
      mockPrisma.triage_sessions.findMany.mockResolvedValue([
        {
          id: 'session-1',
          status: 'COMPLETED',
          symptoms_summary: 'Fever',
          risk_score: 42,
          urgency_level: 'MEDIUM',
          care_level: 'See a doctor within 1-2 days',
          ai_explanation: 'Risk score 42/100 (MEDIUM).',
          created_at: new Date('2026-01-01'),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/triage/history')
        .set('Authorization', 'Bearer valid')
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ id: 'session-1', riskScore: 42 });
      expect(mockPrisma.triage_sessions.findMany).toHaveBeenCalledWith({
        where: { patient_id: 'patient-1' },
        orderBy: { created_at: 'desc' },
      });
    });
  });
});
