import { compareDates, type CalendarDate } from './calendar-date.js';

export interface AmountRecord {
  amountCents: number;
  /** Vale para vencimentos a partir desta data (inclusive). */
  effectiveFrom: CalendarDate;
}

/**
 * Valor vigente numa data: o registro com o maior `effectiveFrom <= date`.
 * Mudar o preço é inserir um registro novo, então o passado nunca muda.
 * Retorna undefined se a data for anterior a todo o histórico.
 */
export function amountAt(
  history: readonly AmountRecord[],
  date: CalendarDate,
): number | undefined {
  let current: AmountRecord | undefined;
  for (const record of history) {
    const appliesToDate = compareDates(record.effectiveFrom, date) <= 0;
    const isMoreRecent =
      !current || compareDates(record.effectiveFrom, current.effectiveFrom) > 0;
    if (appliesToDate && isMoreRecent) {
      current = record;
    }
  }
  return current?.amountCents;
}
