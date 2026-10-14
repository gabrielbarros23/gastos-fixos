import { Injectable, NotFoundException } from '@nestjs/common';
import { Clock } from '../common/clock/clock.service.js';
import { fieldError } from '../common/http/field-error.js';
import { amountAt } from '../domain/amount-history.js';
import {
  compareDates,
  parseCalendarDate,
  toDbDate,
  type CalendarDate,
} from '../domain/calendar-date.js';
import { occurrencesWithPayments } from '../domain/occurrences.js';
import { isOccurrenceDate } from '../domain/recurrence.js';
import { toSchedule } from '../expenses/expense-schedule.js';
import { ExpensesService } from '../expenses/expenses.service.js';
import { OccurrenceResponseDto } from '../occurrences/dto/occurrence-response.dto.js';
import {
  toExpenseOccurrence,
  toPaymentRecord,
} from '../occurrences/occurrence-source.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MarkPaidDto } from './dto/mark-paid.dto.js';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expenses: ExpensesService,
    private readonly clock: Clock,
  ) {}

  /**
   * Marca um vencimento como pago. É aqui que uma ocorrência "virtual" passa a
   * existir no banco, identificada por (expenseId, dueDate).
   */
  async markPaid(
    userId: string,
    expenseId: string,
    dueDate: CalendarDate,
    dto: MarkPaidDto,
  ): Promise<OccurrenceResponseDto> {
    const expense = await this.expenses.findOwned(userId, expenseId);
    const schedule = toSchedule(expense);
    const key = {
      expenseId_dueDate: { expenseId, dueDate: toDbDate(dueDate) },
    };

    // Só dá para pagar um vencimento que a regra gera (ou que já foi pago
    // antes de a regra mudar, para permitir corrigir esse pagamento).
    const alreadyPaid = await this.prisma.payment.findUnique({ where: key });
    if (!alreadyPaid && !isOccurrenceDate(schedule, dueDate)) {
      throw new NotFoundException('Este gasto não tem vencimento nesta data');
    }

    const today = this.clock.today();
    const paidAt = dto.paidAt ? parseCalendarDate(dto.paidAt) : today;
    if (compareDates(paidAt, today) > 0) {
      throw fieldError(
        'paidAt',
        'A data de pagamento não pode estar no futuro',
      );
    }
    const paidAmountCents =
      dto.paidAmountCents ??
      amountAt(schedule.amounts, dueDate) ??
      alreadyPaid!.paidAmountCents;

    // Upsert pela chave única: marcar duas vezes deixa o mesmo estado (PUT idempotente).
    const data = { paidAmountCents, paidAt: toDbDate(paidAt) };
    const payment = await this.prisma.payment.upsert({
      where: key,
      create: { expenseId, dueDate: toDbDate(dueDate), ...data },
      update: data,
    });

    const [occurrence] = occurrencesWithPayments(
      schedule,
      [toPaymentRecord(payment)],
      dueDate,
      dueDate,
    );
    return OccurrenceResponseDto.from(
      toExpenseOccurrence(occurrence, expense),
      today,
    );
  }

  /** Desmarca: a ocorrência volta a ser só calculada. Idempotente. */
  async unmarkPaid(
    userId: string,
    expenseId: string,
    dueDate: CalendarDate,
  ): Promise<void> {
    await this.expenses.findOwned(userId, expenseId);
    await this.prisma.payment.deleteMany({
      where: { expenseId, dueDate: toDbDate(dueDate) },
    });
  }
}
