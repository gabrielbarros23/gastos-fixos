import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUES } from '../common/queues/queues.js';
import { REMINDER_JOBS, type SendReminderJobData } from './reminder-jobs.js';
import { ReminderScannerService } from './reminder-scanner.service.js';
import {
  ReminderSenderService,
  type SendResult,
} from './reminder-sender.service.js';

/** Worker da varredura diária (disparada pelo agendador do BullMQ). */
@Processor(QUEUES.reminders)
export class ReminderScanProcessor extends WorkerHost {
  constructor(private readonly scanner: ReminderScannerService) {
    super();
  }

  async process(job: Job): Promise<{ users: number; queued: number }> {
    if (job.name !== REMINDER_JOBS.scanAll) {
      throw new Error(
        `Job desconhecido na fila ${QUEUES.reminders}: ${job.name}`,
      );
    }
    return this.scanner.scanAll();
  }
}

/**
 * Worker dos envios. Concorrência e limite de vazão protegem o servidor SMTP
 * (provedores de e-mail bloqueiam quem manda rajadas).
 */
@Processor(QUEUES.emails, {
  concurrency: 5,
  limiter: { max: 10, duration: 1000 },
})
export class ReminderEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderEmailProcessor.name);

  constructor(private readonly sender: ReminderSenderService) {
    super();
  }

  process(job: Job<SendReminderJobData>): Promise<SendResult> {
    return this.sender.send(job.data);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<SendReminderJobData> | undefined, error: Error): void {
    const attempts = job
      ? `${job.attemptsMade}/${job.opts.attempts ?? 1}`
      : '?';
    this.logger.warn(
      `Falha ao enviar lembrete ${job?.id} (tentativa ${attempts}): ${error.message}`,
    );
  }
}
