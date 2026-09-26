import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Clock } from '../common/clock/clock.service.js';
import type { Env } from '../config/env.validation.js';
import { daysBetween, toDbDate } from '../domain/calendar-date.js';
import { occurrencesWithPayments } from '../domain/occurrences.js';
import { monthOf } from '../domain/year-month.js';
import { EXPENSE_INCLUDE, toSchedule } from '../expenses/expense-schedule.js';
import { MailService } from '../mail/mail.service.js';
import { renderReminderEmail } from '../mail/templates/reminder-email.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SendReminderJobData } from './reminder-jobs.js';

export type SendResult = 'sent' | 'already-sent' | 'skipped';

@Injectable()
export class ReminderSenderService {
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly clock: Clock,
    config: ConfigService<Env, true>,
  ) {
    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/$/, '');
  }

  /**
   * Envia um lembrete, no máximo uma vez por vencimento:
   * 1. já consta como SENT na tabela → não faz nada (idempotência);
   * 2. revalida tudo (entre a varredura e o envio o usuário pode ter pago,
   *    desativado o gasto ou desligado os lembretes);
   * 3. reserva o lembrete (PENDING), envia e marca como SENT.
   *
   * Se o processo cair entre o SMTP aceitar e o SENT ser gravado, o retry
   * reenvia: é o limite de qualquer sistema que envia e-mail (não existe
   * "exatamente uma vez" com um servidor externo). A janela é de milissegundos.
   */
  async send(job: SendReminderJobData): Promise<SendResult> {
    const key = {
      expenseId_dueDate: {
        expenseId: job.expenseId,
        dueDate: toDbDate(job.dueDate),
      },
    };

    const log = await this.prisma.reminderLog.findUnique({ where: key });
    if (log?.status === 'SENT') return 'already-sent';

    const expense = await this.prisma.expense.findFirst({
      where: { id: job.expenseId, userId: job.userId },
      include: {
        ...EXPENSE_INCLUDE,
        user: true,
        payments: { where: { dueDate: toDbDate(job.dueDate) } },
      },
    });
    if (
      !expense ||
      !expense.user.remindersEnabled ||
      expense.payments.length > 0
    ) {
      return 'skipped';
    }

    const schedule = toSchedule(expense);
    const [occurrence] = occurrencesWithPayments(
      schedule,
      [],
      job.dueDate,
      job.dueDate,
    );
    if (!occurrence) return 'skipped'; // a regra mudou e não vence mais nessa data

    await this.prisma.reminderLog.upsert({
      where: key,
      create: { expenseId: job.expenseId, dueDate: toDbDate(job.dueDate) },
      update: {},
    });

    await this.mail.send(
      renderReminderEmail({
        to: expense.user.email,
        userName: expense.user.name,
        expenseName: expense.name,
        categoryName: expense.category.name,
        amountCents: occurrence.expectedAmountCents,
        dueDate: job.dueDate,
        daysUntil: daysBetween(this.clock.today(), job.dueDate),
        installment: occurrence.installment,
        calendarUrl: `${this.appUrl}/?mes=${monthOf(job.dueDate)}`,
      }),
    );

    await this.prisma.reminderLog.update({
      where: key,
      data: { status: 'SENT', sentAt: this.clock.now() },
    });
    return 'sent';
  }
}
