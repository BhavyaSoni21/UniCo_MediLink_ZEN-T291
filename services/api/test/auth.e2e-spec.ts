import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TOKEN_VERIFIER } from '../src/auth/token-verifier';
import { createMockPrismaService } from './mock-prisma';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

  const mockPrisma = createMockPrismaService();

  const fakeVerifier = {
    verify: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
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

  describe('POST /api/v1/auth/complete-profile', () => {
    it('rejects requests with no bearer token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/complete-profile')
        .send({ role: 'patient' })
        .expect(401);
    });

    it('rejects an unknown role value', async () => {
      fakeVerifier.verify.mockResolvedValue({
        sub: 'user-1',
        email: 'a@example.com',
      });

      return request(app.getHttpServer())
        .post('/api/v1/auth/complete-profile')
        .set('Authorization', 'Bearer valid')
        .send({ role: 'superadmin' })
        .expect(400);
    });

    it('upserts the local user with the resolved role id', async () => {
      fakeVerifier.verify.mockResolvedValue({
        sub: 'user-1',
        email: 'a@example.com',
      });
      mockPrisma.roles.findUnique.mockResolvedValue({
        id: 1,
        role_name: 'patient',
      });
      mockPrisma.users.upsert.mockResolvedValue({
        id: 'user-1',
        email: 'a@example.com',
        account_status: 'ACTIVE',
        created_at: new Date('2026-01-01'),
        roles: { role_name: 'patient' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/complete-profile')
        .set('Authorization', 'Bearer valid')
        .send({ role: 'patient' })
        .expect(201);

      expect(res.body).toMatchObject({
        id: 'user-1',
        email: 'a@example.com',
        role: 'patient',
      });
      expect(mockPrisma.users.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          create: expect.objectContaining({ id: 'user-1', role_id: 1 }),
        }),
      );
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('rejects requests with no bearer token', () => {
      return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('returns 404 when the caller has no local profile yet', async () => {
      fakeVerifier.verify.mockResolvedValue({
        sub: 'user-2',
        email: 'b@example.com',
      });
      mockPrisma.users.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer valid')
        .expect(404);
    });

    it('returns the profile for a provisioned user', async () => {
      fakeVerifier.verify.mockResolvedValue({
        sub: 'user-3',
        email: 'c@example.com',
      });
      mockPrisma.users.findUnique.mockResolvedValue({
        id: 'user-3',
        email: 'c@example.com',
        account_status: 'ACTIVE',
        created_at: new Date('2026-01-01'),
        roles: { role_name: 'doctor' },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer valid')
        .expect(200);

      expect(res.body).toMatchObject({
        id: 'user-3',
        email: 'c@example.com',
        role: 'doctor',
      });
    });
  });
});
