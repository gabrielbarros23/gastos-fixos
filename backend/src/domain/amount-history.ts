import type { CalendarDate } from './calendar-date.js';
import { recordAt, type EffectiveRecord } from './effective-history.js';

export interface AmountRecord extends EffectiveRecord {
  amountCents: number;
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
  return recordAt(history, date)?.amountCents;
}
