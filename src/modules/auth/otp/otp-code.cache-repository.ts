import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { OtpCodeDocument } from './otp-code.schema';

@Injectable()
export class OtpCodeCacheRepository {
  private readonly BY_ID_CACHE_KEY: string = 'otp_code_{id}';
  private readonly EMAIL_CACHE_KEY: string = 'otp_code_email_{email}';

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  public async findById(id: string): Promise<OtpCodeDocument | undefined> {
    return await this.cacheManager.get<OtpCodeDocument>(this.BY_ID_CACHE_KEY.replace('{id}', id));
  }

  public async findByEmail(email: string): Promise<OtpCodeDocument | undefined> {
    return await this.cacheManager.get<OtpCodeDocument>(
      this.EMAIL_CACHE_KEY.replace('{email}', email),
    );
  }

  public async save(otpCode: OtpCodeDocument): Promise<void> {
    await this.cacheManager.set(this.BY_ID_CACHE_KEY.replace('{id}', otpCode.id), otpCode);
    await this.cacheManager.set(this.EMAIL_CACHE_KEY.replace('{email}', otpCode.email), otpCode);
  }

  public async clear(): Promise<void> {
    await this.cacheManager.clear();
  }
}
