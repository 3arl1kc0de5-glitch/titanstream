import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { TelegramAuthService } from '../src/modules/auth/strategies/telegram-auth.service';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

const request = require('supertest');

describe('TitanStream API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TelegramAuthService)
      .useValue({
        parseInitData: (initData: string) => {
          if (initData === 'valid_init_data') {
            return {
              telegramUserId: 123456789,
              firstName: 'Test',
              lastName: 'User',
              username: 'testuser',
              languageCode: 'en',
              photoUrl: null,
            };
          }
          if (initData === 'returning_user') {
            return {
              telegramUserId: 987654321,
              firstName: 'Returning',
              lastName: 'User',
              username: 'returninguser',
              languageCode: 'en',
              photoUrl: null,
            };
          }
          return null;
        },
        parseWebLoginPayload: (payload: any) => {
          if (payload?.hash !== 'valid_widget_hash') {
            throw new Error('INVALID_WEB_LOGIN_SIGNATURE');
          }
          return {
            telegramUserId: payload.id,
            firstName: payload.first_name || 'Widget',
            lastName: payload.last_name,
            username: payload.username,
            languageCode: 'en',
            photoUrl: payload.photo_url,
          };
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);

    await prisma.educationModule.createMany({
      data: [
        {
          id: 'welcome' as any,
          title: 'Welcome',
          description: 'Test module',
          content: [{ type: 'text', data: { text: 'Hello' } }],
          mandatory: true,
          estimatedSeconds: 30,
          orderIndex: 0,
          completionType: 'view_all',
        },
        {
          id: 'quiz' as any,
          title: 'Quiz',
          description: 'Test quiz',
          content: [
            {
              type: 'quiz_question',
              data: {
                question: 'Test?',
                options: ['A', 'B'],
                correctIndex: 0,
                explanation: 'A is correct',
              },
            },
          ],
          mandatory: true,
          estimatedSeconds: 60,
          orderIndex: 1,
          completionType: 'quiz_pass',
          passThreshold: 1,
        },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    await prisma.educationCompletion.deleteMany({});
    await prisma.onboardingProgress.deleteMany({});
    await prisma.userConsent.deleteMany({});
    await prisma.readinessScore.deleteMany({});
    await prisma.readinessHistory.deleteMany({});
    await prisma.userStateTransition.deleteMany({});
    await prisma.auditEvent.deleteMany({});
    await prisma.notificationPreference.deleteMany({});
    await prisma.userLevelRecord.deleteMany({});
    await prisma.userTrustProfile.deleteMany({});
    await prisma.referralRelationship.deleteMany({});
    await prisma.referralCode.deleteMany({});
    await prisma.financialAccount.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.educationModule.deleteMany({});
    await app.close();
  });

  describe('Authentication', () => {
    it('POST /api/v1/auth/telegram - should authenticate a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/telegram')
        .send({ initData: 'valid_init_data' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.telegramUserId).toBe(123456789);
      expect(res.body.data.isNewUser).toBe(true);
    });

    it('POST /api/v1/auth/telegram - should handle returning user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/telegram')
        .send({ initData: 'returning_user' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.telegramUserId).toBe(987654321);
    });

    it('POST /api/v1/auth/telegram-login - should authenticate via Telegram Login Widget', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/telegram-login')
        .send({
          id: 123456789,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
          auth_date: Math.floor(Date.now() / 1000),
          hash: 'valid_widget_hash',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.telegramUserId).toBe(123456789);
      expect(res.body.data.isNewUser).toBe(false);

      const userCount = await prisma.user.count({ where: { telegramUserId: 123456789n } });
      const financialAccountCount = await prisma.financialAccount.count({ where: { telegramUserId: 123456789n } });
      expect(userCount).toBe(1);
      expect(financialAccountCount).toBe(1);
    });

    it('POST /api/v1/auth/telegram - should reject invalid initData', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/telegram')
        .send({ initData: 'invalid_data' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/auth/telegram - should require initData field', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/telegram')
        .send({})
        .expect(400);
    });

    it('POST /api/v1/auth/refresh - should refresh tokens', async () => {
      const authRes = await request(app.getHttpServer())
        .post('/api/v1/auth/telegram')
        .send({ initData: 'valid_init_data' });

      const refreshToken = authRes.body.data.refreshToken;

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });
  });

  describe('Protected Endpoints', () => {
    let authToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/telegram')
        .send({ initData: 'valid_init_data' });
      authToken = res.body.data.accessToken;
    });

    it('GET /api/v1/auth/profile - should return user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.telegramUserId).toBe(123456789);
    });

    it('GET /api/v1/onboarding/state - should return onboarding state', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/onboarding/state')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/onboarding/start - should start onboarding', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/onboarding/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('should reject requests without auth token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/onboarding/state')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Education', () => {
    let authToken: string;
    const testUserId = 123456789;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/telegram')
        .send({ initData: 'valid_init_data' });
      authToken = res.body.data.accessToken;
    });

    it('GET /api/v1/education/modules - should list modules', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/education/modules')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/v1/education/modules/welcome/start - should start a module', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/education/modules/welcome/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/education/modules/welcome/complete - should complete view module', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/education/modules/welcome/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ moduleId: 'welcome' })
        .expect(201);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Consent', () => {
    let authToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/telegram')
        .send({ initData: 'valid_init_data' });
      authToken = res.body.data.accessToken;
    });

    it('GET /api/v1/consent/required - should list required consents', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/consent/required')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/v1/consent/not_a_bank - should record a consent', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/consent/not_a_bank')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ version: 1 })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('GET /api/v1/consent/status - should return consent status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/consent/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Readiness', () => {
    let authToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/telegram')
        .send({ initData: 'valid_init_data' });
      authToken = res.body.data.accessToken;
    });

    it('GET /api/v1/readiness - should return readiness status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/readiness')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/readiness/calculate - should recalculate readiness', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/readiness/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.overallScore).toBeDefined();
      expect(typeof res.body.data.isReady).toBe('boolean');
    });
  });

  describe('User Profile', () => {
    let authToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/telegram')
        .send({ initData: 'valid_init_data' });
      authToken = res.body.data.accessToken;
    });

    it('GET /api/v1/users/me - should return user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.telegramUserId).toBe(123456789);
    });

    it('PATCH /api/v1/users/me - should update profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'Updated' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe('Updated');
    });
  });
});
