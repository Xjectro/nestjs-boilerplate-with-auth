import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { EnvConfig } from '@/shared/config';
import { MailService } from './mail.service';

@Module({
  providers: [
    {
      provide: Resend,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) =>
        new Resend(config.get('RESEND_API_KEY')),
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
