import {
  addDays,
  addMonthsClamped,
  compareDates,
  daysBetween,
  maxDate,
  minDate,
  monthsBetween,
  type CalendarDate,
} from './calendar-date.js';

export const FREQUENCIES = ['WEEKLY', 'MONTHLY', 'YEARLY'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export interface RecurrenceRule {
  frequency: Frequency;
  /** A cada quantas semanas/meses/anos (>= 1). */
  interval: number;
  /** Primeiro vencimento. Define o "dia âncora" da série. */
  startDate: CalendarDate;
  /** Último vencimento possível, inclusivo. */
  endDate?: CalendarDate | null;
  /** Vencimentos nesta data ou depois deixam de existir. */
  deactivatedAt?: CalendarDate | null;
}

export interface RecurrenceOccurrence {
  /** Posição na série, começando em 0 (a parcela é index + 1). */
  index: number;
  date: CalendarDate;
}

/**
 * Data da n-ésima ocorrência (0 = startDate), sem considerar fim ou desativação.
 *
 * Sempre calculada a partir da âncora, nunca da ocorrência anterior: é o que
 * faz um gasto do dia 31 cair em 28/02 e voltar para 31/03.
 */
export function occurrenceAt(
  rule: RecurrenceRule,
  index: number,
): CalendarDate {
  switch (rule.frequency) {
    case 'WEEKLY':
      return addDays(rule.startDate, index * rule.interval * 7);
    case 'MONTHLY':
      return addMonthsClamped(rule.startDate, index * rule.interval);
    case 'YEARLY':
      return addMonthsClamped(rule.startDate, index * rule.interval * 12);
  }
}

/** Última data em que pode haver vencimento, ou null se a série não termina. */
export function lastPossibleDate(rule: RecurrenceRule): CalendarDate | null {
  const beforeDeactivation = rule.deactivatedAt
    ? addDays(rule.deactivatedAt, -1)
    : null;
  if (rule.endDate && beforeDeactivation) {
    return minDate(rule.endDate, beforeDeactivation);
  }
  return rule.endDate ?? beforeDeactivation;
}

/**
 * Índice da primeira ocorrência em `date` ou depois (ignorando o fim da série).
 * Calculado direto, em O(1): não percorre a série desde o início, então
 * consultar 2030 custa o mesmo que consultar o mês atual.
 */
function firstIndexOnOrAfter(rule: RecurrenceRule, date: CalendarDate): number {
  if (compareDates(date, rule.startDate) <= 0) {
    return 0;
  }

  if (rule.frequency === 'WEEKLY') {
    return Math.ceil(daysBetween(rule.startDate, date) / (rule.interval * 7));
  }

  const stepMonths =
    rule.frequency === 'MONTHLY' ? rule.interval : rule.interval * 12;
  // Candidato: a ocorrência que cai no mesmo mês de `date` (ou no último mês
  // da série antes dele). Se ela ficou antes de `date` no mesmo mês, a próxima
  // já está num mês posterior.
  const index = Math.floor(monthsBetween(rule.startDate, date) / stepMonths);
  return compareDates(occurrenceAt(rule, index), date) < 0 ? index + 1 : index;
}

/** Ocorrências entre `from` e `to` (ambos inclusivos), respeitando fim e desativação. */
export function occurrencesBetween(
  rule: RecurrenceRule,
  from: CalendarDate,
  to: CalendarDate,
): RecurrenceOccurrence[] {
  const last = lastPossibleDate(rule);
  const end = last ? minDate(to, last) : to;
  const start = maxDate(from, rule.startDate);

  const occurrences: RecurrenceOccurrence[] = [];
  for (let index = firstIndexOnOrAfter(rule, start); ; index++) {
    const date = occurrenceAt(rule, index);
    if (compareDates(date, end) > 0) break;
    occurrences.push({ index, date });
  }
  return occurrences;
}

/** Primeira ocorrência em `from` ou depois, ou null se a série já terminou. */
export function nextOccurrence(
  rule: RecurrenceRule,
  from: CalendarDate,
): RecurrenceOccurrence | null {
  const index = firstIndexOnOrAfter(rule, from);
  const date = occurrenceAt(rule, index);
  const last = lastPossibleDate(rule);
  if (last && compareDates(date, last) > 0) {
    return null;
  }
  return { index, date };
}

/** Se `date` é um vencimento válido da série. */
export function isOccurrenceDate(
  rule: RecurrenceRule,
  date: CalendarDate,
): boolean {
  return nextOccurrence(rule, date)?.date === date;
}

/** Data da última parcela: a ocorrência de índice `count - 1`. */
export function endDateForInstallments(
  rule: Pick<RecurrenceRule, 'frequency' | 'interval' | 'startDate'>,
  count: number,
): CalendarDate {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError('O número de parcelas deve ser um inteiro >= 1');
  }
  return occurrenceAt(rule, count - 1);
}
