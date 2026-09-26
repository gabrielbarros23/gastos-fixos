import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QUEUES, scheduleRecurringJob } from '../common/queues/queues.js';
import { NodeEnv, type Env } from '../config/env.validation.js';
import { REMINDER_JOBS } from './reminder-jobs.js';

/** Agenda a varredura diária de lembretes (por padrão, 8h em São Paulo). */
@Injectable()
export class RemindersScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(RemindersScheduler.name);

  constructor(
    @InjectQueue(QUEUES.reminders) private readonly queue: Queue,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Nos testes a varredura é disparada manualmente, não pelo relógio.
    if (this.config.get('NODE_ENV', { infer: true }) === NodeEnv.Test) return;

    const pattern = this.config.get('REMINDER_CRON', { infer: true });
    const tz = this.config.get('APP_TIMEZONE', { infer: true });
    await scheduleRecurringJob(
      this.queue,
      'daily-reminder-scan',
      { pattern, tz },
      REMINDER_JOBS.scanAll,
    );
    this.logger.log(`Varredura de lembretes agendada: "${pattern}" (${tz})`);
  }
}
