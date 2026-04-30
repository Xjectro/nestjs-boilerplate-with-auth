import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { MailModule } from '@/integrations/mail';
import { EnvConfig } from '@/shared/config';
import { CustomerModule } from '../customer/customer.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { OtpCodeCacheRepository } from './otp/otp-code.cache-repository';
import { OtpCodeRepository } from './otp/otp-code.repository';
import { OtpCode, OtpCodeSchema } from './otp/otp-code.schema';
import { OtpCodeService } from './otp/otp-code.service';

@Module({
  imports: [
    /** Customer */
    CustomerModule,
    /** Mail */
    MailModule,
    /** Jwt */
    JwtModule.registerAsync({
      useFactory: (config: ConfigService<EnvConfig>) => ({
        secret: config.get('AUTH_JWT_SECRET'),
        signOptions: { expiresIn: '60s' },
      }),
      inject: [ConfigService],
    }),
    /** Mongoose */
    MongooseModule.forFeature([{ name: OtpCode.name, schema: OtpCodeSchema }]),
  ],
  providers: [
    AuthService,
    OtpCodeService,
    OtpCodeRepository,
    OtpCodeCacheRepository,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, OtpCodeService],
})
export class AuthModule {}
