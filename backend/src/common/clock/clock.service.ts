import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation.js';
import { todayIn, type CalendarDate } from '../../domain/calendar-date.js';

/**
 * Fonte única de "agora" da aplicação. Os services nunca chamam `new Date()`
 * para decidir regras de negócio: pedem ao Clock. Assim um teste pode trocar o
 * provider e congelar o tempo (ex.: "hoje é 31/01") sem gambiarras.
 */
@Injectable()
export class Clock {
  private readonly timeZone: string;

  constructor(config: ConfigService<Env, true>) {
    this.timeZone = config.get('APP_TIMEZONE', { infer: true });
  }

  now(): Date {
    return new Date();
  }

  /** Data de hoje no fuso da aplicação (America/Sao_Paulo por padrão). */
  today(): CalendarDate {
    return todayIn(this.timeZone, this.now());
  }
}
