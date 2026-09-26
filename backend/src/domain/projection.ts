import { amountAt, type AmountRecord } from './amount-history.js';
import type { CalendarDate } from './calendar-date.js';
import { occurrencesBetween, type RecurrenceRule } from './recurrence.js';

export interface ExpenseSchedule extends RecurrenceRule {
  installmentCount?: number | null;
  amounts: readonly AmountRecord[];
}

export interface ProjectedOccurrence {
  dueDate: CalendarDate;
  expectedAmountCents: number;
  /** Só para gastos parcelados: "parcela 3 de 12". */
  installment: { number: number; total: number } | null;
}

/**
 * Ocorrências previstas de um gasto num período, cada uma com o valor vigente
 * na sua data de vencimento. É uma função pura: recebe os dados já carregados
 * e não sabe nada de banco. (A mescla com os pagamentos entra na etapa 3.)
 */
export function projectOccurrences(
  expense: ExpenseSchedule,
  from: CalendarDate,
  to: CalendarDate,
): ProjectedOccurrence[] {
  return occurrencesBetween(expense, from, to).map(({ index, date }) => {
    const expectedAmountCents = amountAt(expense.amounts, date);
    if (expectedAmountCents === undefined) {
      // O primeiro valor sempre vale a partir do startDate; se faltar, é bug.
      throw new Error(`Gasto sem valor vigente em ${date}`);
    }
    return {
      dueDate: date,
      expectedAmountCents,
      installment: expense.installmentCount
        ? { number: index + 1, total: expense.installmentCount }
        : null,
    };
  });
}
