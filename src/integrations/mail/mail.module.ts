import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResendModule } from 'nestjs-resend';
import type { EnvConfig } from '@/shared/config';
import { MailService } from './mail.service';

@Module({
  imports: [
    ResendModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        apiKey: config.get('RESEND_API_KEY') ?? '',
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
