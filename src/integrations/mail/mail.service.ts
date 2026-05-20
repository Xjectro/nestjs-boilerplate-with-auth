import { Inject, Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { EnvConfig } from '@/shared/config';
import { RESEND_CLIENT } from './mail.constants';
import { TemplateService } from './template.service';

export type SendMailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
};

@Injectable()
export class MailService {
  constructor(
    @Optional() @Inject(RESEND_CLIENT) private readonly resend: Resend | null,
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly templateService: TemplateService,
  ) {}

  public async send({ to, subject, html, from }: SendMailOptions) {
    if (!this.resend) {
      throw new ServiceUnavailableException(
        'Email service is not configured: RESEND_API_KEY is missing',
      );
    }

    return await this.resend.emails.send({
      from: from ?? this.config.get('RESEND_FROM'),
      to,
      subject,
      html,
    });
  }

  public async sendTemplate({
    to,
    subject,
    template,
    context,
    from,
  }: {
    to: string | string[];
    subject: string;
    template: string;
    context?: Record<string, unknown>;
    from?: string;
  }) {
    const html = await this.templateService.render(template, context ?? {});
    return await this.send({ to, subject, html, from });
  }
}
