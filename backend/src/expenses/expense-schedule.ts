import { fromDbDate } from '../domain/calendar-date.js';
import type { ExpenseSchedule } from '../domain/projection.js';
import type { Prisma } from '../generated/prisma/client.js';

/** O que sempre carregamos junto com um gasto. */
export const EXPENSE_INCLUDE = {
  category: true,
  amounts: { orderBy: { effectiveFrom: 'asc' } },
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
