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

const MEDICINE_ID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
const OTHER_MEDICINE_ID = 'b2c3d4e5-f6a7-4890-b123-456789abcdef';

describe('PharmacyController / ReservationsController (e2e)', () => {
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

  describe('GET /api/v1/pharmacy/medicines/search', () => {
    it('returns results with generic alternatives from the same generic_name group', async () => {
      authAs('user-1', 'patient');
      const panadol = {
        id: MEDICINE_ID,
        generic_name: 'Paracetamol',
        brand_name: 'Panadol',
        manufacturer: 'GSK',
        dosage_form: 'Tablet',
        strength: '500mg',
      };
      const crocin = {
        id: OTHER_MEDICINE_ID,
        generic_name: 'Paracetamol',
        brand_name: 'Crocin',
        manufacturer: 'GSK',
        dosage_form: 'Tablet',
        strength: '500mg',
      };
      mockPrisma.medicines.findMany
        .mockResolvedValueOnce([panadol])
        .mockResolvedValueOnce([panadol, crocin]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/pharmacy/medicines/search?q=paracetamol')
        .set('Authorization', 'Bearer valid')
        .expect(200);

      expect(res.body).toEqual([
        expect.objectContaining({
          id: MEDICINE_ID,
          brandName: 'Panadol',
          genericAlternatives: [
            expect.objectContaining({ id: OTHER_MEDICINE_ID, brandName: 'Crocin' }),
          ],
        }),
      ]);
    });
  });

  describe('GET /api/v1/pharmacy/pharmacies/nearby', () => {
    it('sorts pharmacies by distance when lat/lng are provided', async () => {
      authAs('user-1', 'patient');
      mockPrisma.pharmacies.findMany.mockResolvedValue([
        { id: 'far', pharmacy_name: 'Far Pharmacy', city: 'X', verified: true, latitude: 29.0, longitude: 78.0 },
        { id: 'near', pharmacy_name: 'Near Pharmacy', city: 'X', verified: true, latitude: 28.611, longitude: 77.211 },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/pharmacy/pharmacies/nearby?lat=28.61&lng=77.21')
        .set('Authorization', 'Bearer valid')
        .expect(200);

      expect(res.body[0].id).toBe('near');
      expect(res.body[1].id).toBe('far');
      expect(mockPrisma.patients.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/pharmacy/lookup/check', () => {
    it('filters out pharmacies without available stock', async () => {
      authAs('user-1', 'patient');
      mockPrisma.medicines.findUnique.mockResolvedValue({ id: MEDICINE_ID });
      mockPrisma.pharmacies.findMany.mockResolvedValue([
        {
          id: 'in-stock',
          pharmacy_name: 'In Stock Pharmacy',
          city: 'X',
          verified: true,
          latitude: 28.61,
          longitude: 77.21,
          inventory: [{ stock_quantity: 5, is_available: true }],
        },
        {
          id: 'out-of-stock',
          pharmacy_name: 'Out of Stock Pharmacy',
          city: 'X',
          verified: true,
          latitude: 28.62,
          longitude: 77.22,
          inventory: [{ stock_quantity: 0, is_available: true }],
        },
      ]);

      const res = await request(app.getHttpServer())
        .post('/api/v1/pharmacy/lookup/check')
        .set('Authorization', 'Bearer valid')
        .send({ medicineId: MEDICINE_ID, lat: 28.61, lng: 77.21 })
        .expect(201);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe('in-stock');
    });
  });

  describe('GET /api/v1/pharmacy/pharmacies/:pharmacyId', () => {
    it('returns 404 when the pharmacy does not exist', async () => {
      authAs('user-1', 'patient');
      mockPrisma.pharmacies.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .get('/api/v1/pharmacy/pharmacies/does-not-exist')
        .set('Authorization', 'Bearer valid')
        .expect(404);
    });
  });

  describe('POST /api/v1/pharmacy/pharmacies/:pharmacyId/inventory', () => {
    it('rejects non-admin roles', async () => {
      authAs('user-1', 'patient');

      return request(app.getHttpServer())
        .post('/api/v1/pharmacy/pharmacies/pharmacy-1/inventory')
        .set('Authorization', 'Bearer valid')
        .send({ medicineId: MEDICINE_ID, stockQuantity: 10 })
        .expect(403);
    });

    it('lets admins upsert stock', async () => {
      authAs('user-1', 'admin');
      mockPrisma.pharmacies.findUnique.mockResolvedValue({
        id: 'pharmacy-1',
        pharmacy_name: 'P',
        inventory: [],
      });
      mockPrisma.medicines.findUnique.mockResolvedValue({ id: MEDICINE_ID });

      await request(app.getHttpServer())
        .post('/api/v1/pharmacy/pharmacies/pharmacy-1/inventory')
        .set('Authorization', 'Bearer valid')
        .send({ medicineId: MEDICINE_ID, stockQuantity: 10 })
        .expect(201);

      expect(mockPrisma.pharmacy_inventory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { pharmacy_id_medicine_id: { pharmacy_id: 'pharmacy-1', medicine_id: MEDICINE_ID } },
          update: expect.objectContaining({ stock_quantity: 10 }),
        }),
      );
    });
  });

  describe('POST /api/v1/pharmacy/pharmacies/:pharmacyId/reserve', () => {
    it('rejects when there is not enough stock', async () => {
      authAs('user-1', 'patient');
      mockPrisma.patients.findUnique.mockResolvedValue({ id: 'patient-1' });
      mockPrisma.pharmacies.findUnique.mockResolvedValue({ id: 'pharmacy-1' });
      mockPrisma.pharmacy_inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        stock_quantity: 2,
        is_available: true,
      });

      return request(app.getHttpServer())
        .post('/api/v1/pharmacy/pharmacies/pharmacy-1/reserve')
        .set('Authorization', 'Bearer valid')
        .send({ medicineId: MEDICINE_ID, quantity: 5 })
        .expect(400);
    });

    it('reserves stock and creates a reservation with a pickup code', async () => {
      authAs('user-1', 'patient');
      mockPrisma.patients.findUnique.mockResolvedValue({ id: 'patient-1' });
      mockPrisma.pharmacies.findUnique.mockResolvedValue({ id: 'pharmacy-1' });
      mockPrisma.pharmacy_inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        stock_quantity: 10,
        is_available: true,
      });
      mockPrisma.medicine_reservations.create.mockResolvedValue({ id: 'res-1' });
      mockPrisma.medicine_reservations.findUnique.mockResolvedValue({
        id: 'res-1',
        quantity: 2,
        status: 'PENDING',
        pickup_code: 'ABC123',
        created_at: new Date('2026-01-01'),
        pharmacies: { id: 'pharmacy-1', pharmacy_name: 'Test Pharmacy' },
        medicines: { id: MEDICINE_ID, generic_name: 'Paracetamol', brand_name: 'Panadol' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/pharmacy/pharmacies/pharmacy-1/reserve')
        .set('Authorization', 'Bearer valid')
        .send({ medicineId: MEDICINE_ID, quantity: 2 })
        .expect(201);

      expect(mockPrisma.pharmacy_inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: { stock_quantity: 8 },
        }),
      );
      expect(res.body).toMatchObject({ id: 'res-1', pickupCode: 'ABC123' });
    });
  });

  describe('POST /api/v1/pharmacy/reservations/:reservationId/cancel', () => {
    it('returns 404 when the reservation belongs to a different patient', async () => {
      authAs('user-1', 'patient');
      mockPrisma.patients.findUnique.mockResolvedValue({ id: 'patient-1' });
      mockPrisma.medicine_reservations.findUnique.mockResolvedValue({
        id: 'res-1',
        patient_id: 'someone-elses-patient-id',
        status: 'PENDING',
      });

      return request(app.getHttpServer())
        .post('/api/v1/pharmacy/reservations/res-1/cancel')
        .set('Authorization', 'Bearer valid')
        .expect(404);
    });

    it('restores stock for the owning patient', async () => {
      authAs('user-1', 'patient');
      mockPrisma.patients.findUnique.mockResolvedValue({ id: 'patient-1' });
      mockPrisma.medicine_reservations.findUnique.mockResolvedValue({
        id: 'res-1',
        patient_id: 'patient-1',
        pharmacy_id: 'pharmacy-1',
        medicine_id: MEDICINE_ID,
        quantity: 3,
        status: 'PENDING',
        pickup_code: 'ABC123',
        created_at: new Date('2026-01-01'),
        pharmacies: { id: 'pharmacy-1', pharmacy_name: 'Test Pharmacy' },
        medicines: { id: MEDICINE_ID, generic_name: 'Paracetamol', brand_name: 'Panadol' },
      });
      mockPrisma.pharmacy_inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        stock_quantity: 5,
      });

      await request(app.getHttpServer())
        .post('/api/v1/pharmacy/reservations/res-1/cancel')
        .set('Authorization', 'Bearer valid')
        .expect(201);

      expect(mockPrisma.medicine_reservations.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELLED' } }),
      );
      expect(mockPrisma.pharmacy_inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { stock_quantity: 8 } }),
      );
    });
  });
});
