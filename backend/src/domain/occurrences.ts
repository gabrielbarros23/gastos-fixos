import { amountAt } from './amount-history.js';
import { compareDates, type CalendarDate } from './calendar-date.js';
import {
  projectOccurrences,
  type ExpenseSchedule,
  type ProjectedOccurrence,
} from './projection.js';

export interface PaymentRecord {
  /** Qual vencimento foi pago (chave natural da ocorrência junto com o gasto). */
  dueDate: CalendarDate;
  /** Valor realmente pago; pode ser diferente do previsto. */
  paidAmountCents: number;
  /** Data em que o usuário pagou. */
  paidAt: CalendarDate;
}

export type OccurrenceStatus = 'PAID' | 'PENDING' | 'OVERDUE';

export interface Occurrence extends ProjectedOccurrence {
  payment: PaymentRecord | null;
}

/**
 * Ocorrências de um gasto no período, já com o pagamento de cada uma.
 *
 * As previstas vêm da regra (nunca do banco). Os pagamentos são fatos: se a
 * regra mudou depois (ex.: o dia de vencimento foi alterado), um pagamento que
 * não bate mais com nenhum vencimento previsto continua aparecendo, porque o
 * dinheiro saiu de verdade naquele dia.
 */
export function occurrencesWithPayments(
  schedule: ExpenseSchedule,
  payments: readonly PaymentRecord[],
  from: CalendarDate,
  to: CalendarDate,
): Occurrence[] {
  const inPeriod = payments.filter(
    (p) =>
      compareDates(p.dueDate, from) >= 0 && compareDates(p.dueDate, to) <= 0,
  );
  const paymentByDate = new Map(inPeriod.map((p) => [p.dueDate, p]));

  const projected = projectOccurrences(schedule, from, to);
  const occurrences: Occurrence[] = projected.map((occurrence) => ({
    ...occurrence,
    payment: paymentByDate.get(occurrence.dueDate) ?? null,
  }));

  const projectedDates = new Set(projected.map((o) => o.dueDate));
  for (const payment of inPeriod) {
    if (!projectedDates.has(payment.dueDate)) {
      occurrences.push({
        dueDate: payment.dueDate,
        expectedAmountCents:
          amountAt(schedule.amounts, payment.dueDate) ??
          payment.paidAmountCents,
        installment: null,
        payment,
      });
    }
  }

  return occurrences.sort((a, b) => compareDates(a.dueDate, b.dueDate));
}

export function occurrenceStatus(
  occurrence: Pick<Occurrence, 'dueDate' | 'payment'>,
  today: CalendarDate,
): OccurrenceStatus {
  if (occurrence.payment) return 'PAID';
  return compareDates(occurrence.dueDate, today) < 0 ? 'OVERDUE' : 'PENDING';
}

export interface OccurrenceTotals {
  /** Soma dos valores previstos (pagas ou não). */
  expectedCents: number;
  /** Soma do que foi efetivamente pago. */
  paidCents: number;
  /** Previsto das que ainda não foram pagas (inclui as atrasadas). */
  pendingCents: number;
  /** Previsto das não pagas cujo vencimento já passou. */
  overdueCents: number;
  occurrenceCount: number;
  paidCount: number;
}

export function totalsOf(
  occurrences: readonly Pick<
    Occurrence,
    'dueDate' | 'expectedAmountCents' | 'payment'
  >[],
  today: CalendarDate,
): OccurrenceTotals {
  const totals: OccurrenceTotals = {
    expectedCents: 0,
    paidCents: 0,
    pendingCents: 0,
    overdueCents: 0,
    occurrenceCount: 0,
    paidCount: 0,
  };
  for (const occurrence of occurrences) {
    totals.occurrenceCount += 1;
    totals.expectedCents += occurrence.expectedAmountCents;
    const status = occurrenceStatus(occurrence, today);
    if (status === 'PAID') {
      totals.paidCount += 1;
      totals.paidCents += occurrence.payment!.paidAmountCents;
    } else {
      totals.pendingCents += occurrence.expectedAmountCents;
      if (status === 'OVERDUE')
        totals.overdueCents += occurrence.expectedAmountCents;
    }
  }
  return totals;
}

/** Agrupa itens por uma chave preservando a ordem de primeira aparição. */
export function groupBy<T, K>(
  items: readonly T[],
  keyOf: (item: T) => K,
): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}
