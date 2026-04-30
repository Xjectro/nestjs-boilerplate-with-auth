import { Inject, Injectable } from '@nestjs/common';
import { OtpCodeCacheRepository } from './otp-code.cache-repository';
import { OtpCodeRepository } from './otp-code.repository';
import { OtpCode } from './otp-code.schema';

@Injectable()
export class OtpCodeService {
  constructor(
    @Inject(OtpCodeRepository) private readonly otpCodeRepository: OtpCodeRepository,
    @Inject(OtpCodeCacheRepository)
    private readonly otpCodeCacheRepository: OtpCodeCacheRepository,
  ) {}

  public async findById(id: string) {
    const cached = await this.otpCodeCacheRepository.findById(id);
    if (cached) {
      return cached;
    }

    const otpCode = await this.otpCodeRepository.findById(id);
    if (otpCode) {
      await this.otpCodeCacheRepository.save(otpCode);
    }

    return otpCode;
  }

  public async findByEmail(email: string) {
    const cached = await this.otpCodeCacheRepository.findByEmail(email);
    if (cached) {
      return cached;
    }

    const otpCode = await this.otpCodeRepository.findByEmail(email);
    if (otpCode) {
      await this.otpCodeCacheRepository.save(otpCode);
    }

    return otpCode;
  }

  public async create(payload: Omit<OtpCode, '_id' | 'id'>) {
    const otpCode = await this.otpCodeRepository.create(payload);
    await this.otpCodeCacheRepository.save(otpCode);
    return otpCode;
  }

  public async updateById(id: string, payload: Partial<OtpCode>) {
    const otpCode = await this.otpCodeRepository.updateById(id, payload);
    if (otpCode) {
      await this.otpCodeCacheRepository.save(otpCode);
    }
    return otpCode;
  }
}
