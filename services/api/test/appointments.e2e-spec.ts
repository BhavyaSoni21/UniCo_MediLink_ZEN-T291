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

describe('AppointmentsController / QueueController (e2e)', () => {
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

  const appointmentRow = {
    id: 'appt-1',
    patient_id: 'patient-1',
    doctor_id: 'doctor-1',
    hospital_id: 'hosp-1',
    department_id: null,
    appointment_date: new Date('2026-08-03T09:00:00.000Z'),
    appointment_type: 'CONSULTATION',
    appointment_status: 'SCHEDULED',
    priority_level: 'LOW',
    created_at: new Date('2026-08-01T00:00:00.000Z'),
    patients: { id: 'patient-1', users: { name: 'Pat Test' } },
    doctors: { id: 'doctor-1', users: { name: 'Dr Test' } },
    hospitals: { id: 'hosp-1', name: 'Test Hospital', city: 'Rivertown' },
    departments: null,
    queue_entry: { id: 'q-1', queue_position: 1, estimated_wait: 8, status: 'WAITING' },
  };

  describe('GET /api/v1/appointments/availability', () => {
    it('generates slots from the schedule minus booked times', async () => {
      authAs('user-1', 'patient');
      mockPrisma.doctors.findUnique.mockResolvedValue({ id: 'doctor-1' });
      mockPrisma.doctor_schedules.findMany.mockResolvedValue([
        { day_of_week: 1, start_time: '09:00', end_time: '10:00', slot_duration_minutes: 30 },
      ]);
      mockPrisma.appointments.findMany.mockResolvedValue([
        { appointment_date: new Date('2026-08-03T09:00:00.000Z') },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/appointments/availability?doctorId=doctor-1&date=2026-08-03')
        .set('Authorization', 'Bearer valid')
        .expect(200);

      // 2026-08-03 is a Monday (day_of_week 1); the 09:00 slot is booked so
      // only 09:30 should remain from a 09:00-10:00 window at 30min slots.
      expect(res.body).toEqual(['2026-08-03T09:30:00.000Z']);
    });
  });

  describe('POST /api/v1/appointments', () => {
    it('books an appointment and creates a queue entry', async () => {
      authAs('user-1', 'patient');
      mockPrisma.patients.findUnique.mockResolvedValue({ id: 'patient-1' });
      mockPrisma.doctors.findUnique.mockResolvedValue({ id: 'doctor-1', hospital_id: 'hosp-1' });
      mockPrisma.appointments.create.mockResolvedValue({ id: 'appt-1' });
      mockPrisma.queue_entries.count.mockResolvedValue(0);
      mockPrisma.appointments.findUnique.mockResolvedValue(appointmentRow);

      const res = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', 'Bearer valid')
        .send({
          doctorId: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
          appointmentDate: '2026-08-03T09:00:00.000Z',
        })
        .expect(201);

      expect(mockPrisma.queue_entries.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ appointment_id: 'appt-1', queue_position: 1 }),
        }),
      );
      expect(res.body).toMatchObject({ id: 'appt-1' });
    });

    it('rejects double-booking the same doctor/slot with 400', async () => {
      authAs('user-1', 'patient');
      mockPrisma.patients.findUnique.mockResolvedValue({ id: 'patient-1' });
      mockPrisma.doctors.findUnique.mockResolvedValue({ id: 'doctor-1', hospital_id: 'hosp-1' });
      mockPrisma.appointments.create.mockRejectedValue({ code: 'P2002' });

      return request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', 'Bearer valid')
        .send({
          doctorId: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
          appointmentDate: '2026-08-03T09:00:00.000Z',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/appointments/me', () => {
    it('lists the caller patient appointments', async () => {
      authAs('user-1', 'patient');
      mockPrisma.patients.findUnique.mockResolvedValue({ id: 'patient-1' });
      mockPrisma.appointments.findMany.mockResolvedValue([appointmentRow]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/appointments/me')
        .set('Authorization', 'Bearer valid')
        .expect(200);

      expect(res.body).toEqual([expect.objectContaining({ id: 'appt-1' })]);
    });
  });

  describe('PATCH /api/v1/appointments/:appointmentId', () => {
    it('returns 404 when rescheduling an appointment that belongs to a different patient', async () => {
      authAs('user-1', 'patient');
      mockPrisma.patients.findUnique.mockResolvedValue({ id: 'patient-1' });
      mockPrisma.appointments.findUnique.mockResolvedValue({
        ...appointmentRow,
        patient_id: 'someone-elses-patient-id',
      });

      return request(app.getHttpServer())
        .patch('/api/v1/appointments/appt-1')
        .set('Authorization', 'Bearer valid')
        .send({ appointmentDate: '2026-08-04T09:00:00.000Z' })
        .expect(404);
    });
  });

  describe('POST /api/v1/appointments/:appointmentId/cancel', () => {
    it('lets the owning patient cancel and cancels the paired queue entry', async () => {
      authAs('user-1', 'patient');
      mockPrisma.patients.findUnique.mockResolvedValue({ id: 'patient-1' });
      mockPrisma.doctors.findUnique.mockResolvedValue(null);
      mockPrisma.appointments.findUnique.mockResolvedValue({
        ...appointmentRow,
        patient_id: 'patient-1',
      });

      await request(app.getHttpServer())
        .post('/api/v1/appointments/appt-1/cancel')
        .set('Authorization', 'Bearer valid')
        .expect(201);

      expect(mockPrisma.appointments.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'appt-1' },
          data: { appointment_status: 'CANCELLED' },
        }),
      );
      expect(mockPrisma.queue_entries.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { appointment_id: 'appt-1' },
          data: { status: 'CANCELLED' },
        }),
      );
    });
  });

  describe('PATCH /api/v1/appointments/:appointmentId/status', () => {
    it('rejects the patient role', async () => {
      authAs('user-1', 'patient');

      return request(app.getHttpServer())
        .patch('/api/v1/appointments/appt-1/status')
        .set('Authorization', 'Bearer valid')
        .send({ status: 'CHECKED_IN' })
        .expect(403);
    });

    it('lets the assigned doctor update status', async () => {
      authAs('user-1', 'doctor');
      mockPrisma.doctors.findUnique.mockResolvedValue({ id: 'doctor-1' });
      mockPrisma.appointments.findUnique.mockResolvedValue({
        ...appointmentRow,
        doctor_id: 'doctor-1',
      });
      mockPrisma.patients.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/api/v1/appointments/appt-1/status')
        .set('Authorization', 'Bearer valid')
        .send({ status: 'CHECKED_IN' })
        .expect(200);

      expect(mockPrisma.appointments.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { appointment_status: 'CHECKED_IN' } }),
      );
      expect(mockPrisma.queue_entries.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CALLED' } }),
      );
    });
  });

  describe('GET /api/v1/queues/:hospitalId', () => {
    it('orders entries by priority then by creation time', async () => {
      authAs('user-1', 'patient');
      mockPrisma.queue_entries.findMany.mockResolvedValue([
        {
          id: 'q-low',
          appointment_id: 'appt-low',
          status: 'WAITING',
          created_at: new Date('2026-08-01T00:00:00.000Z'),
          appointments: { priority_level: 'LOW', patients: { users: { name: 'Low Patient' } } },
        },
        {
          id: 'q-emergency',
          appointment_id: 'appt-emergency',
          status: 'WAITING',
          created_at: new Date('2026-08-01T01:00:00.000Z'),
          appointments: {
            priority_level: 'EMERGENCY',
            patients: { users: { name: 'Emergency Patient' } },
          },
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/queues/hosp-1')
        .set('Authorization', 'Bearer valid')
        .expect(200);

      expect(res.body[0]).toMatchObject({ patientName: 'Emergency Patient', queuePosition: 1 });
      expect(res.body[1]).toMatchObject({ patientName: 'Low Patient', queuePosition: 2 });
    });
  });
});
