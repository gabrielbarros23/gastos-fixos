import { Injectable } from '@nestjs/common';
import { Clock } from '../common/clock/clock.service.js';
import { groupBy, totalsOf } from '../domain/occurrences.js';
import {
  firstDayOf,
  lastDayOf,
  monthOf,
  nextMonths,
  parseYearMonth,
} from '../domain/year-month.js';
import { SummaryQueryDto, SummaryResponseDto } from './dto/summary.dto.js';
import { OccurrencesService } from './occurrences.service.js';

export const PROJECTION_MONTHS = 6;

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

    // Duas consultas em paralelo: o mês pedido e os 6 seguintes de uma vez.
    const [ofMonth, ofProjection] = await Promise.all([
      this.occurrences.findInPeriod(
        userId,
        firstDayOf(month),
        lastDayOf(month),
      ),
      this.occurrences.findInPeriod(
        userId,
        firstDayOf(projectionMonths[0]),
        lastDayOf(projectionMonths[projectionMonths.length - 1]),
      ),
    ]);

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

    const byMonth = groupBy(ofProjection, (o) => monthOf(o.dueDate));

    return {
      month,
      ...totalsOf(ofMonth, today),
      byCategory,
      projection: projectionMonths.map((m) => ({
        month: m,
        expectedCents: totalsOf(byMonth.get(m) ?? [], today).expectedCents,
      })),
    };
  }
}
