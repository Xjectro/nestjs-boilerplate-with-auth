import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { EnvConfig } from '@/shared/config';

export type SendMailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
};

@Injectable()
export class MailService {
  constructor(
    private readonly resend: Resend,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  public async send({ to, subject, html, from }: SendMailOptions) {
    return await this.resend.emails.send({
      from: from ?? this.config.get('RESEND_FROM'),
      to,
      subject,
      html,
    });
  }
}
