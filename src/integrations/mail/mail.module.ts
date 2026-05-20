import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { EnvConfig } from '@/shared/config';
import { RESEND_CLIENT } from './mail.constants';
import { MailService } from './mail.service';
import { TemplateService } from './template.service';

@Module({
  providers: [
    TemplateService,
    {
      provide: RESEND_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => {
        const apiKey = config.get('RESEND_API_KEY');
        return apiKey ? new Resend(apiKey) : null;
      },
    },
    MailService,
  ],
  exports: [MailService, TemplateService],
})
export class MailModule {}
