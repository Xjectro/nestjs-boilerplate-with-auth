import helmet from '@fastify/helmet';
import { ConsoleSeqLogger, SeqLogger } from '@jasonsoft/nestjs-seq';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { Response } from 'supertest';
import { AppModule } from '@/app.module';
import { LoggingInterceptor } from '@/integrations/logger/logging.interceptor';
import { MailService } from '@/integrations/mail';
import { GlobalExceptionFilter } from '@/shared/filters/global-exception.filter';
import { ResponseInterceptor } from '@/shared/interceptors/response.interceptor';
import { assertErrorPayload, assertSuccessPayload } from './utils/api-assertions';

describe('AuthController (e2e)', () => {
  let app: NestFastifyApplication;
  let capturedOtpCodes: Map<string, string> = new Map();

  const mockMailService = {
    send: jest.fn().mockImplementation((mailOptions: any) => {
      // Extract OTP code from mail content or subject
      const emailMatch = mailOptions.to;
      const contentMatch = mailOptions.html?.match(/(\d{6})/);
      if (contentMatch && contentMatch[1]) {
        capturedOtpCodes.set(emailMatch, contentMatch[1]);
      }
      return Promise.resolve();
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mockMailService)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.register(helmet, { contentSecurityPolicy: false });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const swaggerConfig = new DocumentBuilder()
      .setTitle('E-Commerce Backend')
      .setDescription('E-Commerce Backend API')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .build();
    const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, documentFactory);

    const seqLogger = app.get(SeqLogger);
    app.useGlobalFilters(new GlobalExceptionFilter(seqLogger));
    app.useLogger(app.get(ConsoleSeqLogger));
    app.useGlobalInterceptors(app.get(LoggingInterceptor), app.get(ResponseInterceptor));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Registration Flow', () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'SecurePassword123!';
    let accessToken: string;

    it('should register a new customer', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          firstName: 'Test',
          lastName: 'User',
          password: testPassword,
        })
        .expect(201);

      const envelope = assertSuccessPayload<Record<string, unknown>>(response.body as unknown);

      expect(envelope.data?.message).toBeDefined();
      expect(String(envelope.data?.message)).toContain('Registration successful');
    });

    it('should reject duplicate email registration', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          firstName: 'Test',
          lastName: 'User',
          password: testPassword,
        })
        .expect(409)
        .expect((res: Response) => {
          const error = assertErrorPayload(res.body as unknown);
          expect(error.errorCode).toBe('EMAIL_ALREADY_IN_USE');
        });
    });

    it('should verify email with OTP and return access token', async () => {
      const otpCode = capturedOtpCodes.get(testEmail);
      expect(otpCode).toBeDefined();

      const response = await request(app.getHttpServer())
        .post('/auth/register-verify-otp-code')
        .send({
          email: testEmail,
          otpCode: otpCode!,
        })
        .expect(200);

      const envelope = assertSuccessPayload<Record<string, unknown>>(response.body as unknown);

      expect(envelope.data?.accessToken).toBeDefined();
      expect(typeof envelope.data?.accessToken).toBe('string');

      accessToken = String(envelope.data?.accessToken);
    });

    it('should fetch user profile with valid access token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const envelope = assertSuccessPayload<any>(response.body as unknown);

      expect(envelope.data.email).toBe(testEmail);
      expect(envelope.data.firstName).toBe('Test');
      expect(envelope.data.lastName).toBe('User');
    });

    it('should reject profile access without valid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401)
        .expect((res: Response) => {
          const error = assertErrorPayload(res.body as unknown);
          expect(error.errorCode).toBe('TOKEN_INVALID');
        });
    });
  });

  describe('Login Flow', () => {
    const testEmail = `login-test-${Date.now()}@example.com`;
    const testPassword = 'SecurePassword123!';
    let accessToken: string;

    beforeAll(async () => {
      // Register a user first
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          firstName: 'Login',
          lastName: 'Tester',
          password: testPassword,
        })
        .expect(201);

      const otpCode = capturedOtpCodes.get(testEmail);
      expect(otpCode).toBeDefined();

      // Verify registration
      await request(app.getHttpServer())
        .post('/auth/register-verify-otp-code')
        .send({
          email: testEmail,
          otpCode: otpCode!,
        })
        .expect(200);
    });

    it('should send OTP code on valid credentials', async () => {
      capturedOtpCodes.delete(testEmail); // Clear previous OTP

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      const envelope = assertSuccessPayload<Record<string, unknown>>(response.body as unknown);

      expect(envelope.data?.message).toBeDefined();
      expect(String(envelope.data?.message)).toContain('OTP code sent');
    });

    it('should reject login with invalid password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!',
        })
        .expect(401)
        .expect((res: Response) => {
          const error = assertErrorPayload(res.body as unknown);
          expect(error.errorCode).toBe('PASSWORD_INVALID');
        });
    });

    it('should reject login with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword,
        })
        .expect(401)
        .expect((res: Response) => {
          const error = assertErrorPayload(res.body as unknown);
          expect(error.errorCode).toBe('EMAIL_NOT_FOUND');
        });
    });

    it('should verify login OTP and return access token', async () => {
      const otpCode = capturedOtpCodes.get(testEmail);
      expect(otpCode).toBeDefined();

      const response = await request(app.getHttpServer())
        .post('/auth/login-verify-otp-code')
        .send({
          email: testEmail,
          otpCode: otpCode!,
        })
        .expect(200);

      const envelope = assertSuccessPayload<Record<string, unknown>>(response.body as unknown);

      expect(envelope.data?.accessToken).toBeDefined();
      expect(typeof envelope.data?.accessToken).toBe('string');

      accessToken = String(envelope.data?.accessToken);
    });

    it('should use the access token to access protected endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const envelope = assertSuccessPayload<any>(response.body as unknown);

      expect(envelope.data.email).toBe(testEmail);
    });
  });

  describe('Password Reset Flow', () => {
    const testEmail = `reset-test-${Date.now()}@example.com`;
    const initialPassword = 'InitialPassword123!';
    const newPassword = 'NewPassword456!';

    beforeAll(async () => {
      // Register a user first
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          firstName: 'Reset',
          lastName: 'Tester',
          password: initialPassword,
        })
        .expect(201);

      const otpCode = capturedOtpCodes.get(testEmail);
      expect(otpCode).toBeDefined();

      // Verify registration
      await request(app.getHttpServer())
        .post('/auth/register-verify-otp-code')
        .send({
          email: testEmail,
          otpCode: otpCode!,
        })
        .expect(200);
    });

    it('should send OTP code for password reset', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: testEmail,
        })
        .expect(200);

      const envelope = assertSuccessPayload<Record<string, unknown>>(response.body as unknown);

      expect(envelope.data?.message).toBeDefined();
      expect(String(envelope.data?.message)).toContain('password reset');
    });

    it('should verify forgot password OTP', async () => {
      const otpCode = capturedOtpCodes.get(testEmail);
      expect(otpCode).toBeDefined();

      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password-verify-otp-code')
        .send({
          email: testEmail,
          otpCode: otpCode!,
        })
        .expect(200);

      const envelope = assertSuccessPayload<Record<string, unknown>>(response.body as unknown);

      expect(envelope.data?.message).toBeDefined();
      expect(String(envelope.data?.message)).toContain('verified');
    });

    it('should reset password with valid OTP', async () => {
      capturedOtpCodes.delete(testEmail); // Clear previous OTP

      // Get fresh OTP
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: testEmail,
        })
        .expect(200);

      const otpCode = capturedOtpCodes.get(testEmail);
      expect(otpCode).toBeDefined();

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          email: testEmail,
          otpCode: otpCode!,
          newPassword,
        })
        .expect(200);

      const envelope = assertSuccessPayload<Record<string, unknown>>(response.body as unknown);

      expect(envelope.data?.message).toBeDefined();
      expect(String(envelope.data?.message)).toContain('successfully');
    });

    it('should login with the new password after reset', async () => {
      capturedOtpCodes.delete(testEmail); // Clear previous OTP

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: newPassword,
        })
        .expect(200);

      const envelope = assertSuccessPayload<Record<string, unknown>>(response.body as unknown);

      expect(envelope.data?.message).toBeDefined();
      expect(String(envelope.data?.message)).toContain('OTP code sent');
    });

    it('should fail login with old password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: initialPassword,
        })
        .expect(401)
        .expect((res: Response) => {
          const error = assertErrorPayload(res.body as unknown);
          expect(error.errorCode).toBe('PASSWORD_INVALID');
        });
    });
  });
});
