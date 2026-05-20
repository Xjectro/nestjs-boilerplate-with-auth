import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { MailService } from '@/integrations/mail';
import { CustomerService } from '../../customer/customer.service';
import { CustomerRole } from '../../customer/entities/customer-role.enum';
import { AuthService } from '../auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  LoginVerifyDto,
  RegisterDto,
  ResetPasswordDto,
  ResetPasswordVerifyDto,
} from '../dto';
import { OtpCode, OtpCodePurpose } from '../otp/otp-code.schema';
import { OtpCodeService } from '../otp/otp-code.service';

jest.mock('bcrypt');

type TestCustomer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  roles: CustomerRole[];
};

type CreateCustomerPayload = Omit<TestCustomer, 'id'>;

type TestOtpCode = Pick<OtpCode, 'id' | 'code' | 'expiresAt' | 'used' | 'purpose'>;

const mockCustomer = {
  id: 'customer-id-1',
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  passwordHash: '$2b$10$hashedpassword',
  roles: [CustomerRole.CUSTOMER],
};

const mockCustomerService = {
  findByEmail: jest.fn<(email: string) => Promise<TestCustomer | null>>(),
  create: jest.fn<(payload: CreateCustomerPayload) => Promise<TestCustomer>>(),
  update: jest.fn<(id: string, payload: Partial<TestCustomer>) => Promise<TestCustomer>>(),
};

const mockOtpCodeService = {
  findByEmail: jest.fn<(email: string) => Promise<TestOtpCode | null>>().mockResolvedValue(null),
  create: jest
    .fn<(payload: Omit<OtpCode, '_id' | 'id'>) => Promise<Pick<TestOtpCode, 'id'>>>()
    .mockResolvedValue({} as Pick<TestOtpCode, 'id'>),
  updateById: jest
    .fn<(id: string, payload: Partial<OtpCode>) => Promise<TestOtpCode | null | undefined>>()
    .mockResolvedValue(undefined),
};

const mockMailService = {
  sendTemplate: jest
    .fn<(options: { to: string | string[]; subject: string; template: string; context?: Record<string, unknown>; from?: string }) => Promise<void>>()
    .mockResolvedValue(undefined),
};

const mockJwtService = {
  signAsync: jest
    .fn<(payload: Record<string, unknown>, options?: { expiresIn?: string }) => Promise<string>>()
    .mockResolvedValue('mock.jwt.token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: CustomerService, useValue: mockCustomerService },
        { provide: OtpCodeService, useValue: mockOtpCodeService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    jest.mocked(bcrypt.compare).mockClear();
    jest.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'user@example.com',
      password: 'password123',
    };

    it('should send OTP code on valid credentials', async () => {
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockCustomerService.findByEmail.mockResolvedValue(mockCustomer);
      mockOtpCodeService.findByEmail.mockResolvedValue(null);
      mockOtpCodeService.create.mockResolvedValue({ id: 'otp-1' });
      mockMailService.sendTemplate.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(result).toEqual({ message: 'OTP code sent to your email' });
      expect(mockCustomerService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(mockOtpCodeService.create).toHaveBeenCalled();
      expect(mockMailService.sendTemplate).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when email is not found', async () => {
      mockCustomerService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockCustomerService.findByEmail).toHaveBeenCalledWith(loginDto.email);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      jest.mocked(bcrypt.compare).mockResolvedValue(false as never);
      mockCustomerService.findByEmail.mockResolvedValue(mockCustomer);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('loginVerify', () => {
    const loginVerifyDto: LoginVerifyDto = {
      email: 'user@example.com',
      otpCode: '123456',
    };

    it('should return access token on valid OTP', async () => {
      mockCustomerService.findByEmail.mockResolvedValue(mockCustomer);
      mockOtpCodeService.findByEmail.mockResolvedValue({
        id: 'otp-1',
        code: '123456',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        used: false,
        purpose: OtpCodePurpose.LOGIN,
      });
      mockOtpCodeService.updateById.mockResolvedValue(undefined);

      const result = await service.loginVerify(loginVerifyDto);

      expect(result).toEqual({ accessToken: 'mock.jwt.token' });
      expect(mockCustomerService.findByEmail).toHaveBeenCalledWith(loginVerifyDto.email);
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: mockCustomer.id, email: mockCustomer.email, roles: mockCustomer.roles },
        { expiresIn: '1h' },
      );
      expect(mockOtpCodeService.updateById).toHaveBeenCalledWith('otp-1', { used: true });
    });

    it('should throw UnauthorizedException when email is not found', async () => {
      mockCustomerService.findByEmail.mockResolvedValue(null);

      await expect(service.loginVerify(loginVerifyDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'new@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      password: 'password123',
    };

    it('should create customer and send OTP code', async () => {
      mockCustomerService.findByEmail.mockResolvedValue(null);
      mockCustomerService.create.mockResolvedValue({
        ...mockCustomer,
        email: registerDto.email,
      });
      mockOtpCodeService.findByEmail.mockResolvedValue(null);
      mockOtpCodeService.create.mockResolvedValue({ id: 'otp-1' });
      mockMailService.sendTemplate.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        message: 'Registration successful. Please verify your email with the OTP code sent.',
      });
      expect(mockCustomerService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(mockCustomerService.create).toHaveBeenCalled();
      expect(mockOtpCodeService.create).toHaveBeenCalled();
      expect(mockMailService.sendTemplate).toHaveBeenCalled();
    });

    it('should throw ConflictException when email already in use', async () => {
      mockCustomerService.findByEmail.mockResolvedValue(mockCustomer);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockCustomerService.create).not.toHaveBeenCalled();
    });
  });

  describe('registerVerify', () => {
    const registerVerifyDto: LoginVerifyDto = {
      email: 'new@example.com',
      otpCode: '123456',
    };

    it('should return access token on valid OTP', async () => {
      mockCustomerService.findByEmail.mockResolvedValue(mockCustomer);
      mockOtpCodeService.findByEmail.mockResolvedValue({
        id: 'otp-1',
        code: '123456',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        used: false,
        purpose: OtpCodePurpose.REGISTER,
      });
      mockOtpCodeService.updateById.mockResolvedValue(undefined);

      const result = await service.registerVerify(registerVerifyDto);

      expect(result).toEqual({ accessToken: 'mock.jwt.token' });
      expect(mockCustomerService.findByEmail).toHaveBeenCalledWith(registerVerifyDto.email);
      expect(mockOtpCodeService.updateById).toHaveBeenCalledWith('otp-1', { used: true });
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: mockCustomer.id, email: mockCustomer.email, roles: mockCustomer.roles },
        { expiresIn: '1h' },
      );
    });

    it('should throw UnauthorizedException when email is not found', async () => {
      mockCustomerService.findByEmail.mockResolvedValue(null);

      await expect(service.registerVerify(registerVerifyDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'user@example.com',
    };

    it('should send OTP code for password reset', async () => {
      mockCustomerService.findByEmail.mockResolvedValue(mockCustomer);
      mockOtpCodeService.findByEmail.mockResolvedValue(null);
      mockOtpCodeService.create.mockResolvedValue({ id: 'otp-1' });
      mockMailService.sendTemplate.mockResolvedValue(undefined);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result).toEqual({ message: 'OTP code sent to your email for password reset' });
      expect(mockCustomerService.findByEmail).toHaveBeenCalledWith(forgotPasswordDto.email);
      expect(mockOtpCodeService.create).toHaveBeenCalled();
      expect(mockMailService.sendTemplate).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when email is not found', async () => {
      mockCustomerService.findByEmail.mockResolvedValue(null);

      await expect(service.forgotPassword(forgotPasswordDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPasswordVerify', () => {
    const forgotPasswordVerifyDto: ResetPasswordVerifyDto = {
      email: 'user@example.com',
      otpCode: '123456',
    };

    it('should verify OTP code for password reset', async () => {
      mockCustomerService.findByEmail.mockResolvedValue(mockCustomer);
      mockOtpCodeService.findByEmail.mockResolvedValue({
        id: 'otp-1',
        code: '123456',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        used: false,
        purpose: OtpCodePurpose.FORGOT_PASSWORD,
      });

      const result = await service.forgotPasswordVerify(forgotPasswordVerifyDto);

      expect(result).toEqual({
        message: 'OTP code verified. You can now reset your password.',
      });
      expect(mockCustomerService.findByEmail).toHaveBeenCalledWith(forgotPasswordVerifyDto.email);
    });

    it('should throw UnauthorizedException when email is not found', async () => {
      mockCustomerService.findByEmail.mockResolvedValue(null);

      await expect(service.forgotPasswordVerify(forgotPasswordVerifyDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      email: 'user@example.com',
      otpCode: '123456',
      newPassword: 'newpassword123',
    };

    it('should reset password on valid OTP', async () => {
      mockCustomerService.findByEmail.mockResolvedValue(mockCustomer);
      mockOtpCodeService.findByEmail.mockResolvedValue({
        id: 'otp-1',
        code: '123456',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        used: false,
        purpose: OtpCodePurpose.FORGOT_PASSWORD,
      });
      mockCustomerService.update.mockResolvedValue({
        ...mockCustomer,
        passwordHash: 'newhash',
      });
      mockOtpCodeService.updateById.mockResolvedValue(undefined);

      const result = await service.resetPassword(resetPasswordDto);

      expect(result).toEqual({ message: 'Password has been reset successfully' });
      expect(mockCustomerService.findByEmail).toHaveBeenCalledWith(resetPasswordDto.email);
      expect(mockCustomerService.update).toHaveBeenCalledWith(
        mockCustomer.id,
        expect.objectContaining({ passwordHash: expect.any(String) }),
      );
      expect(mockOtpCodeService.updateById).toHaveBeenCalledWith('otp-1', { used: true });
    });

    it('should throw UnauthorizedException when email is not found', async () => {
      mockCustomerService.findByEmail.mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
