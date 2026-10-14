import { fromDbDate, type CalendarDate } from '../domain/calendar-date.js';
import type { CardCycle } from '../domain/credit-card.js';
import { recordAt } from '../domain/effective-history.js';
import type { ExpenseSchedule } from '../domain/projection.js';
import type { PaymentMethod, Prisma } from '../generated/prisma/client.js';

/** O que sempre carregamos junto com um gasto. */
export const EXPENSE_INCLUDE = {
  category: true,
  amounts: { orderBy: { effectiveFrom: 'asc' } },
  paymentMethods: {
    orderBy: { effectiveFrom: 'asc' },
    include: { paymentMethod: true },
  },
} as const satisfies Prisma.ExpenseInclude;

export type ExpenseWithRelations = Prisma.ExpenseGetPayload<{
  include: typeof EXPENSE_INCLUDE;
}>;

/**
 * Ponte entre o registro do banco e o domínio puro: converte as colunas `date`
 * (que o Prisma entrega como Date à meia-noite UTC) em CalendarDate.
 */
export function toSchedule(expense: ExpenseWithRelations): ExpenseSchedule {
  return {
    frequency: expense.frequency,
    interval: expense.interval,
    startDate: fromDbDate(expense.startDate),
    endDate: expense.endDate ? fromDbDate(expense.endDate) : null,
    deactivatedAt: expense.deactivatedAt
      ? fromDbDate(expense.deactivatedAt)
      : null,
    installmentCount: expense.installmentCount,
    amounts: expense.amounts.map((amount) => ({
      amountCents: amount.amountCents,
      effectiveFrom: fromDbDate(amount.effectiveFrom),
    })),
  };
}

/** Forma de pagamento vigente numa data, ou null ("sem forma de pagamento"). */
export function paymentMethodAt(
  expense: ExpenseWithRelations,
  date: CalendarDate,
): PaymentMethod | null {
  const history = expense.paymentMethods.map((assignment) => ({
    paymentMethod: assignment.paymentMethod,
    effectiveFrom: fromDbDate(assignment.effectiveFrom),
  }));
  return recordAt(history, date)?.paymentMethod ?? null;
}

/** Ciclo da fatura, se a forma de pagamento for cartão de crédito. */
export function cardCycleOf(method: PaymentMethod | null): CardCycle | null {
  return method?.type === 'CREDIT_CARD' &&
    method.closingDay !== null &&
    method.dueDay !== null
    ? { closingDay: method.closingDay, dueDay: method.dueDay }
    : null;
}
