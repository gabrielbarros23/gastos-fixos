import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '../common/queues/queues.js';
import { MailModule } from '../mail/mail.module.js';
import { OccurrencesModule } from '../occurrences/occurrences.module.js';
import { UsersModule } from '../users/users.module.js';
import {
  ReminderEmailProcessor,
  ReminderScanProcessor,
} from './reminder.processors.js';
import { ReminderScannerService } from './reminder-scanner.service.js';
import { ReminderSenderService } from './reminder-sender.service.js';
import { RemindersController } from './reminders.controller.js';
import { RemindersScheduler } from './reminders.scheduler.js';

const DAY_SECONDS = 24 * 60 * 60;

@Module({
  imports: [
    MailModule,
    OccurrencesModule,
    UsersModule,
    BullModule.registerQueue(
      { name: QUEUES.reminders },
      {
        name: QUEUES.emails,
        defaultJobOptions: {
          // SMTP instável é o caso normal: tenta 5x com espera crescente
          // (30s, 1min, 2min, 4min) antes de desistir.
          attempts: 5,
          backoff: { type: 'exponential', delay: 30_000 },
          // Mantém histórico para inspeção, sem crescer o Redis para sempre.
          removeOnComplete: { age: 7 * DAY_SECONDS, count: 1000 },
          removeOnFail: { age: 30 * DAY_SECONDS },
        },
      },
    ),
  ],
  controllers: [RemindersController],
  providers: [
    ReminderScannerService,
    ReminderSenderService,
    ReminderScanProcessor,
    ReminderEmailProcessor,
    RemindersScheduler,
  ],
})
export class RemindersModule {}
