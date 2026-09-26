import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QUEUES, scheduleRecurringJob } from '../common/queues/queues.js';
import { NodeEnv, type Env } from '../config/env.validation.js';
import { RefreshTokensService } from './refresh-tokens.service.js';

export const CLEANUP_JOB = 'delete-expired-refresh-tokens';

/** Agenda a limpeza diária de refresh tokens expirados (3h da manhã). */
@Injectable()
export class RefreshTokenCleanupScheduler implements OnApplicationBootstrap {
  constructor(
    @InjectQueue(QUEUES.maintenance) private readonly queue: Queue,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get('NODE_ENV', { infer: true }) === NodeEnv.Test) return;
    await scheduleRecurringJob(
      this.queue,
      'daily-refresh-token-cleanup',
      {
        pattern: '0 3 * * *',
        tz: this.config.get('APP_TIMEZONE', { infer: true }),
      },
      CLEANUP_JOB,
    );
  }
}

@Processor(QUEUES.maintenance)
export class MaintenanceProcessor extends WorkerHost {
  private readonly logger = new Logger(MaintenanceProcessor.name);

  constructor(private readonly refreshTokens: RefreshTokensService) {
    super();
  }

  async process(job: { name: string }): Promise<number> {
    if (job.name !== CLEANUP_JOB) {
      throw new Error(
        `Job desconhecido na fila ${QUEUES.maintenance}: ${job.name}`,
      );
    }
    const deleted = await this.refreshTokens.deleteExpired();
    this.logger.log(`Refresh tokens expirados removidos: ${deleted}`);
    return deleted;
  }
}
