import * as crypto from 'crypto';
import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailService } from '@/integrations/mail';
import { ApiErrorCode } from '@/shared/http';
import { CustomerService } from '../customer/customer.service';
import { CustomerRole } from '../customer/entities/customer-role.enum';
import { Customer } from '../customer/entities/customer.schema';
import {
  ForgotPasswordDto,
  LoginDto,
  LoginVerifyDto,
  RegisterDto,
  ResetPasswordDto,
  ResetPasswordVerifyDto,
} from './dto';
import { OtpCode, OtpCodePurpose } from './otp/otp-code.schema';
import { OtpCodeService } from './otp/otp-code.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(CustomerService) private readonly customerService: CustomerService,
    @Inject(OtpCodeService) private readonly otpCodeService: OtpCodeService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(MailService) private readonly mailService: MailService,
  ) {}

  public async login({ email, password }: LoginDto) {
    const customer = await this.customerService.findByEmail(email);
    if (!customer) {
      throw new UnauthorizedException({
        message: 'Email not found',
        errorCode: ApiErrorCode.EMAIL_NOT_FOUND,
      });
    }

    const isPasswordValid = await this.verifyPassword(password, customer.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        message: 'Invalid password provided',
        errorCode: ApiErrorCode.PASSWORD_INVALID,
      });
    }

    const otpCode = await this.createOtpCode(customer, OtpCodePurpose.LOGIN);
    await this.sendOtpMail(customer.email, otpCode, OtpCodePurpose.LOGIN);

    return { message: 'OTP code sent to your email' };
  }

  public async loginVerify({ email, otpCode }: LoginVerifyDto) {
    const customer = await this.customerService.findByEmail(email);
    if (!customer) {
      throw new UnauthorizedException({
        message: 'Email not found',
        errorCode: ApiErrorCode.EMAIL_NOT_FOUND,
      });
    }

    const otpRecord = await this.verifyOtpCode(customer, otpCode, OtpCodePurpose.LOGIN);

    const payload = { sub: customer.id, email: customer.email, roles: customer.roles ?? [] };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '1h' });

    await this.markOtpAsUsed(otpRecord);

    return { accessToken };
  }

  public async register({ firstName, lastName, email, password }: RegisterDto) {
    const existing = await this.customerService.findByEmail(email);
    if (existing) {
      throw new ConflictException({
        message: 'Email already in use',
        errorCode: ApiErrorCode.EMAIL_ALREADY_IN_USE,
      });
    }

    const hashedPassword = await this.hashPassword(password);
    const newCustomer = await this.customerService.create({
      firstName,
      lastName,
      email,
      passwordHash: hashedPassword,
      isEmailVerified: false,
      roles: [CustomerRole.CUSTOMER],
    });

    const otpCode = await this.createOtpCode(newCustomer, OtpCodePurpose.REGISTER);
    await this.sendOtpMail(newCustomer.email, otpCode, OtpCodePurpose.REGISTER);

    return { message: 'Registration successful. Please verify your email with the OTP code sent.' };
  }

  public async registerVerify({ email, otpCode }: LoginVerifyDto) {
    const customer = await this.customerService.findByEmail(email);
    if (!customer) {
      throw new UnauthorizedException({
        message: 'Email not found',
        errorCode: ApiErrorCode.EMAIL_NOT_FOUND,
      });
    }

    const otpRecord = await this.verifyOtpCode(customer, otpCode, OtpCodePurpose.REGISTER);

    const payload = { sub: customer.id, email: customer.email, roles: customer.roles ?? [] };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '1h' });

    await this.markOtpAsUsed(otpRecord);

    return { accessToken };
  }

  public async forgotPassword({ email }: ForgotPasswordDto) {
    const customer = await this.customerService.findByEmail(email);
    if (!customer) {
      throw new UnauthorizedException({
        message: 'Email not found',
        errorCode: ApiErrorCode.EMAIL_NOT_FOUND,
      });
    }

    const otpCode = await this.createOtpCode(customer, OtpCodePurpose.FORGOT_PASSWORD);
    await this.sendOtpMail(customer.email, otpCode, OtpCodePurpose.FORGOT_PASSWORD);

    return { message: 'OTP code sent to your email for password reset' };
  }

  public async forgotPasswordVerify({ email, otpCode }: ResetPasswordVerifyDto) {
    const customer = await this.customerService.findByEmail(email);
    if (!customer) {
      throw new UnauthorizedException({
        message: 'Email not found',
        errorCode: ApiErrorCode.EMAIL_NOT_FOUND,
      });
    }

    await this.verifyOtpCode(customer, otpCode, OtpCodePurpose.FORGOT_PASSWORD);

    return { message: 'OTP code verified. You can now reset your password.' };
  }

  public async resetPassword({ email, otpCode, newPassword }: ResetPasswordDto) {
    const customer = await this.customerService.findByEmail(email);
    if (!customer) {
      throw new UnauthorizedException({
        message: 'Email not found',
        errorCode: ApiErrorCode.EMAIL_NOT_FOUND,
      });
    }

    const otpRecord = await this.verifyOtpCode(customer, otpCode, OtpCodePurpose.FORGOT_PASSWORD);

    const hashedPassword = await this.hashPassword(newPassword);
    await this.customerService.update(customer.id, { passwordHash: hashedPassword });

    await this.markOtpAsUsed(otpRecord);

    return { message: 'Password has been reset successfully' };
  }

  /** Utils */
  private async verifyPassword(password: string, hashedPassword: string) {
    return await bcrypt.compare(password, hashedPassword);
  }

  private async hashPassword(password: string) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  private async createOtpCode(customer: Customer, purpose: OtpCodePurpose) {
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const existingOtp = await this.otpCodeService.findByEmail(customer.email);

    if (existingOtp) {
      await this.otpCodeService.updateById(existingOtp.id, {
        customer: customer.id,
        email: customer.email,
        code: otpCode,
        expiresAt,
        used: false,
        purpose,
      });
      return otpCode;
    }

    await this.otpCodeService.create({
      customer: customer.id,
      email: customer.email,
      code: otpCode,
      /** OTP code expires in 5 minutes */
      expiresAt,
      used: false,
      purpose,
    });
    return otpCode;
  }

  private async sendOtpMail(email: string, otpCode: string, purpose: OtpCodePurpose) {
    const subject =
      purpose === OtpCodePurpose.LOGIN ? 'Your login verification code' : 'Your registration code';

    await this.mailService.send({
      to: email,
      subject,
      html: `<p>Your verification code is: <strong>${otpCode}</strong></p><p>This code expires in 5 minutes.</p>`,
    });
  }

  private async verifyOtpCode(customer: Customer, code: string, purpose: OtpCodePurpose) {
    const otpRecord = await this.otpCodeService.findByEmail(customer.email);
    if (!otpRecord || otpRecord.code !== code) {
      throw new UnauthorizedException({
        message: 'Invalid OTP code',
        errorCode: ApiErrorCode.OTP_INVALID,
      });
    }
    if (otpRecord.expiresAt < new Date()) {
      throw new UnauthorizedException({
        message: 'OTP code has expired',
        errorCode: ApiErrorCode.OTP_EXPIRED,
      });
    }
    if (otpRecord.used) {
      throw new UnauthorizedException({
        message: 'OTP code has already been used',
        errorCode: ApiErrorCode.OTP_ALREADY_USED,
      });
    }
    if (otpRecord.purpose !== purpose) {
      throw new UnauthorizedException({
        message: 'OTP code purpose mismatch',
        errorCode: ApiErrorCode.OTP_PURPOSE_MISMATCH,
      });
    }
    await this.customerService.update(customer.id, { isEmailVerified: true });
    return otpRecord;
  }

  private async markOtpAsUsed(otpRecord: OtpCode) {
    await this.otpCodeService.updateById(otpRecord.id, { used: true });
  }
}
