import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Clock } from '../common/clock/clock.service.js';
import { QUEUES } from '../common/queues/queues.js';
import { addDays, fromDbDate, toDbDate } from '../domain/calendar-date.js';
import { OccurrencesService } from '../occurrences/occurrences.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  REMINDER_JOBS,
  sendReminderJobId,
  type SendReminderJobData,
} from './reminder-jobs.js';

const USER_BATCH_SIZE = 500;

export interface ScanTarget {
  id: string;
  reminderDaysBefore: number;
}

/**
 * Descobre quais lembretes precisam sair e enfileira um job de envio para cada
 * um. Não envia nada: separar "descobrir" de "enviar" deixa cada envio com seu
 * próprio retry, sem refazer a varredura inteira quando um e-mail falha.
 */
@Injectable()
export class ReminderScannerService {
  private readonly logger = new Logger(ReminderScannerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly occurrences: OccurrencesService,
    private readonly clock: Clock,
    @InjectQueue(QUEUES.emails) private readonly emails: Queue,
  ) {}

  /** Varre todos os usuários com lembretes ligados, em lotes (paginação por cursor). */
  async scanAll(): Promise<{ users: number; queued: number }> {
    let users = 0;
    let queued = 0;
    let cursor: string | undefined;

    for (;;) {
      const batch = await this.prisma.user.findMany({
        where: { remindersEnabled: true },
        select: { id: true, reminderDaysBefore: true },
        orderBy: { id: 'asc' },
        take: USER_BATCH_SIZE,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      });
      for (const user of batch) {
        queued += await this.scanUser(user);
      }
      users += batch.length;
      if (batch.length < USER_BATCH_SIZE) break;
      cursor = batch[batch.length - 1].id;
    }

    this.logger.log(
      `Varredura concluída: ${users} usuários, ${queued} lembretes enfileirados`,
    );
    return { users, queued };
  }

  /**
   * Janela = de hoje até hoje + N dias. Olhar a janela inteira (e não só
   * "daqui a exatamente N dias") deixa o processo auto-recuperável: se o
   * servidor ficou fora ontem, o lembrete sai hoje. A tabela de lembretes já
   * enviados impede a duplicata.
   */
  async scanUser(user: ScanTarget): Promise<number> {
    const today = this.clock.today();
    const until = addDays(today, user.reminderDaysBefore);

    const unpaid = (
      await this.occurrences.findInPeriod(user.id, today, until)
    ).filter((occurrence) => !occurrence.payment);
    if (unpaid.length === 0) return 0;

    const alreadySent = await this.prisma.reminderLog.findMany({
      where: {
        status: 'SENT',
        OR: unpaid.map((o) => ({
          expenseId: o.expense.id,
          dueDate: toDbDate(o.dueDate),
        })),
      },
      select: { expenseId: true, dueDate: true },
    });
    const sentKeys = new Set(
      alreadySent.map((log) => `${log.expenseId}|${fromDbDate(log.dueDate)}`),
    );

    const jobs = unpaid
      .filter((o) => !sentKeys.has(`${o.expense.id}|${o.dueDate}`))
      .map((o) => {
        const data: SendReminderJobData = {
          userId: user.id,
          expenseId: o.expense.id,
          dueDate: o.dueDate,
        };
        return {
          name: REMINDER_JOBS.send,
          data,
          opts: { jobId: sendReminderJobId(data, today) },
        };
      });

    if (jobs.length > 0) {
      await this.emails.addBulk(jobs);
    }
    return jobs.length;
  }
}
