import { fromDbDate } from '../domain/calendar-date.js';
import type { Occurrence, PaymentRecord } from '../domain/occurrences.js';
import type { ExpenseWithRelations } from '../expenses/expense-schedule.js';
import type { Payment } from '../generated/prisma/client.js';

/** Ocorrência calculada junto com o gasto de onde ela veio. */
export interface ExpenseOccurrence extends Occurrence {
  expense: ExpenseWithRelations;
}

export function toPaymentRecord(payment: Payment): PaymentRecord {
  return {
    dueDate: fromDbDate(payment.dueDate),
    paidAmountCents: payment.paidAmountCents,
    paidAt: fromDbDate(payment.paidAt),
  };
}
