import {
  addMonthsClamped,
  daysInMonth,
  fromParts,
  type CalendarDate,
} from './calendar-date.js';

/** Mês de calendário no formato `YYYY-MM` (ex.: resumo de "2026-10"). */
export type YearMonth = string & { readonly __brand: 'YearMonth' };

const YEAR_MONTH = /^(\d{4})-(\d{2})$/;

export function isValidYearMonth(value: string): boolean {
  const match = YEAR_MONTH.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

export function parseYearMonth(value: string): YearMonth {
  if (!isValidYearMonth(value)) {
    throw new RangeError(`Mês inválido: "${value}"`);
  }
  return value as YearMonth;
}

/** Mês ao qual uma data pertence. */
export function monthOf(date: CalendarDate): YearMonth {
  return date.slice(0, 7) as YearMonth;
}

export function firstDayOf(month: YearMonth): CalendarDate {
  const [year, m] = month.split('-').map(Number);
  return fromParts({ year, month: m, day: 1 });
}

export function lastDayOf(month: YearMonth): CalendarDate {
  const [year, m] = month.split('-').map(Number);
  return fromParts({ year, month: m, day: daysInMonth(year, m) });
}

export function addMonthsToYearMonth(
  month: YearMonth,
  months: number,
): YearMonth {
  return monthOf(addMonthsClamped(firstDayOf(month), months));
}

/** Os `count` meses seguintes a `month` (sem incluir ele). */
export function nextMonths(month: YearMonth, count: number): YearMonth[] {
  return Array.from({ length: count }, (_, i) =>
    addMonthsToYearMonth(month, i + 1),
  );
}
