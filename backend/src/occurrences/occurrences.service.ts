import { Injectable } from '@nestjs/common';
import { Clock } from '../common/clock/clock.service.js';
import { fieldError } from '../common/http/field-error.js';
import {
  compareDates,
  daysBetween,
  parseCalendarDate,
  toDbDate,
  type CalendarDate,
} from '../domain/calendar-date.js';
import {
  groupBy,
  occurrencesWithPayments,
  totalsOf,
} from '../domain/occurrences.js';
import { toSchedule } from '../expenses/expense-schedule.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OccurrenceResponseDto } from './dto/occurrence-response.dto.js';
import {
  MAX_PERIOD_DAYS,
  OccurrencesQueryDto,
} from './dto/occurrences-query.dto.js';
import { OccurrencesResponseDto } from './dto/occurrences-response.dto.js';
import {
  toPaymentRecord,
  type ExpenseOccurrence,
} from './occurrence-source.js';

@Injectable()
export class OccurrencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  /** GET /occurrences: vencimentos do período agrupados por dia, com totais. */
  async list(
    userId: string,
    query: OccurrencesQueryDto,
  ): Promise<OccurrencesResponseDto> {
    const from = parseCalendarDate(query.from);
    const to = parseCalendarDate(query.to);
    if (compareDates(from, to) > 0) {
      throw fieldError(
        'to',
        'O fim do período deve ser igual ou posterior ao início',
      );
    }
    if (daysBetween(from, to) + 1 > MAX_PERIOD_DAYS) {
      throw fieldError(
        'to',
        `O período pode ter no máximo ${MAX_PERIOD_DAYS} dias`,
      );
    }

    const today = this.clock.today();
    const occurrences = (await this.findInPeriod(userId, from, to)).sort(
      (a, b) =>
        compareDates(a.dueDate, b.dueDate) ||
        a.expense.name.localeCompare(b.expense.name, 'pt-BR'),
    );
    const periodTotals = totalsOf(occurrences, today);

    return {
      from,
      to,
      totalExpectedCents: periodTotals.expectedCents,
      totalPaidCents: periodTotals.paidCents,
      days: [...groupBy(occurrences, (o) => o.dueDate)].map(([date, items]) => {
        const dayTotals = totalsOf(items, today);
        return {
          date,
          totalExpectedCents: dayTotals.expectedCents,
          totalPaidCents: dayTotals.paidCents,
          occurrences: items.map((o) => OccurrenceResponseDto.from(o, today)),
        };
      }),
    };
  }

  /**
   * Todas as ocorrências (já com pagamento) dos gastos do usuário no período.
   *
   * Nada disso está gravado: o banco guarda as regras e os pagamentos, e as
   * ocorrências são calculadas agora. Por isso consultar 2030 funciona igual
   * a consultar o mês atual, sem nenhum job que "gere" meses futuros.
   */
  async findInPeriod(
    userId: string,
    from: CalendarDate,
    to: CalendarDate,
  ): Promise<ExpenseOccurrence[]> {
    const dueInPeriod = { gte: toDbDate(from), lte: toDbDate(to) };

    const expenses = await this.prisma.expense.findMany({
      where: {
        userId,
        OR: [
          // A regra pode gerar vencimentos no período...
          {
            startDate: { lte: toDbDate(to) },
            AND: [
              { OR: [{ endDate: null }, { endDate: { gte: toDbDate(from) } }] },
              {
                OR: [
                  { deactivatedAt: null },
                  { deactivatedAt: { gt: toDbDate(from) } },
                ],
              },
            ],
          },
          // ...ou existe pagamento no período (mesmo que a regra tenha mudado).
          { payments: { some: { dueDate: dueInPeriod } } },
        ],
      },
      include: {
        category: true,
        amounts: { orderBy: { effectiveFrom: 'asc' } },
        payments: { where: { dueDate: dueInPeriod } },
      },
    });

    return expenses.flatMap((expense) =>
      occurrencesWithPayments(
        toSchedule(expense),
        expense.payments.map(toPaymentRecord),
        from,
        to,
      ).map((occurrence) => ({ ...occurrence, expense })),
    );
  }
}
