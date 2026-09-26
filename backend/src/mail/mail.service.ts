import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { Env } from '../config/env.validation.js';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  /** Versão texto puro, para clientes que não exibem HTML. */
  text: string;
}

/**
 * Envio de e-mail via SMTP. Em desenvolvimento aponta para o Mailpit, que
 * captura tudo sem entregar de verdade (http://localhost:8025).
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly address: string;

  constructor(config: ConfigService<Env, true>) {
    const host = config.get('SMTP_HOST', { infer: true });
    const port = config.get('SMTP_PORT', { infer: true });
    const user = config.get('SMTP_USER', { infer: true });
    this.address = `${host}:${port}`;
    this.from = config.get('MAIL_FROM', { infer: true });
    this.transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: user
        ? { user, pass: config.get('SMTP_PASSWORD', { infer: true }) }
        : undefined,
    });
  }

  async onModuleInit(): Promise<void> {
    // SMTP fora do ar não derruba a API: os envios falham e a fila re-tenta.
    try {
      await this.transporter.verify();
    } catch (error) {
      this.logger.warn(
        `Servidor SMTP indisponível em ${this.address}: ${(error as Error).message}`,
      );
    }
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.from, ...message });
  }
}
