import { Injectable } from '@nestjs/common';
import { Clock } from '../common/clock/clock.service.js';
import { invoiceDueIn } from '../domain/credit-card.js';
import type { CalendarDate } from '../domain/calendar-date.js';
import { groupBy, totalsOf } from '../domain/occurrences.js';
import {
  monthOf,
  nextMonths,
  parseYearMonth,
  type YearMonth,
} from '../domain/year-month.js';
import { cardCycleOf } from '../expenses/expense-schedule.js';
import { PaymentMethodRefDto } from '../payment-methods/dto/payment-method-response.dto.js';
import {
  PaymentMethodSummaryDto,
  SummaryQueryDto,
  SummaryResponseDto,
} from './dto/summary.dto.js';
import type { ExpenseOccurrence } from './occurrence-source.js';
import { OccurrencesService } from './occurrences.service.js';

export const PROJECTION_MONTHS = 6;

/** Maior previsto primeiro; "sem forma de pagamento" sempre por último. */
function byExpectedDesc<
  T extends { paymentMethod: unknown; expectedCents: number },
>(a: T, b: T): number {
  if (!a.paymentMethod !== !b.paymentMethod) return a.paymentMethod ? -1 : 1;
  return b.expectedCents - a.expectedCents;
}

@Injectable()
export class SummaryService {
  constructor(
    private readonly occurrences: OccurrencesService,
    private readonly clock: Clock,
  ) {}

  async get(
    userId: string,
    query: SummaryQueryDto,
  ): Promise<SummaryResponseDto> {
    const today = this.clock.today();
    const month = query.month ? parseYearMonth(query.month) : monthOf(today);
    const projectionMonths = nextMonths(month, PROJECTION_MONTHS);

    // Uma consulta só: o mês pedido e os 6 seguintes, já pelo mês em que cada
    // cobrança pesa (no cartão, o mês do vencimento da fatura).
    const billed = await this.occurrences.findBilledIn(
      userId,
      month,
      projectionMonths[projectionMonths.length - 1],
    );
    const byMonth = groupBy(billed, (o) => o.billing.month);
    const ofMonth = byMonth.get(month) ?? [];

    const byCategory = [...groupBy(ofMonth, (o) => o.expense.categoryId)]
      .map(([, items]) => {
        const { category } = items[0].expense;
        const totals = totalsOf(items, today);
        return {
          category: {
            id: category.id,
            name: category.name,
            color: category.color,
          },
          expectedCents: totals.expectedCents,
          paidCents: totals.paidCents,
          occurrenceCount: totals.occurrenceCount,
        };
      })
      .sort((a, b) => b.expectedCents - a.expectedCents);

    return {
      month,
      ...totalsOf(ofMonth, today),
      byPaymentMethod: this.byPaymentMethod(ofMonth, month, today),
      byCategory,
      projection: projectionMonths.map((m) => {
        const items = byMonth.get(m) ?? [];
        return {
          month: m,
          expectedCents: totalsOf(items, today).expectedCents,
          byPaymentMethod: [...groupBy(items, (o) => o.paymentMethod?.id)]
            .map(([, group]) => ({
              paymentMethod: refOf(group[0]),
              expectedCents: totalsOf(group, today).expectedCents,
            }))
            .sort(byExpectedDesc),
        };
      }),
    };
  }

  /** Quanto cada forma de pagamento cobra no mês (no cartão, a fatura que vence nele). */
  private byPaymentMethod(
    ofMonth: ExpenseOccurrence[],
    month: YearMonth,
    today: CalendarDate,
  ): PaymentMethodSummaryDto[] {
    return [...groupBy(ofMonth, (o) => o.paymentMethod?.id)]
      .map(([, items]) => {
        const cycle = cardCycleOf(items[0].paymentMethod);
        const totals = totalsOf(items, today);
        return {
          paymentMethod: refOf(items[0]),
          invoice: cycle && invoiceDueIn(month, cycle),
          expectedCents: totals.expectedCents,
          paidCents: totals.paidCents,
          pendingCents: totals.pendingCents,
          occurrenceCount: totals.occurrenceCount,
        };
      })
      .sort(byExpectedDesc);
  }
}

function refOf(occurrence: ExpenseOccurrence): PaymentMethodRefDto | null {
  return (
    occurrence.paymentMethod &&
    PaymentMethodRefDto.from(occurrence.paymentMethod)
  );
}
