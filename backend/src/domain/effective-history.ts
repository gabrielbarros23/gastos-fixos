import { compareDates, type CalendarDate } from './calendar-date.js';

/** Registro de um histórico com data de vigência (valor, forma de pagamento...). */
export interface EffectiveRecord {
  /** Vale para vencimentos a partir desta data (inclusive). */
  effectiveFrom: CalendarDate;
}

/**
 * Registro vigente numa data: o de maior `effectiveFrom <= date`. Mudar algo é
 * inserir um registro novo, então o passado nunca muda. Retorna undefined se a
 * data for anterior a todo o histórico. Não depende da ordem do array.
 */
export function recordAt<T extends EffectiveRecord>(
  history: readonly T[],
  date: CalendarDate,
): T | undefined {
  let current: T | undefined;
  for (const record of history) {
    const appliesToDate = compareDates(record.effectiveFrom, date) <= 0;
    const isMoreRecent =
      !current || compareDates(record.effectiveFrom, current.effectiveFrom) > 0;
    if (appliesToDate && isMoreRecent) {
      current = record;
    }
  }
  return current;
}
