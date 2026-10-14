import { fromDbDate } from '../domain/calendar-date.js';
import { billingOf, type Billing } from '../domain/credit-card.js';
import type { Occurrence, PaymentRecord } from '../domain/occurrences.js';
import {
  cardCycleOf,
  paymentMethodAt,
  type ExpenseWithRelations,
} from '../expenses/expense-schedule.js';
import type { Payment, PaymentMethod } from '../generated/prisma/client.js';

/** Ocorrência calculada junto com o gasto de onde ela veio. */
export interface ExpenseOccurrence extends Occurrence {
  expense: ExpenseWithRelations;
  /** Forma de pagamento vigente na data do vencimento. */
  paymentMethod: PaymentMethod | null;
  /** Mês em que a cobrança pesa (no cartão, o do vencimento da fatura). */
  billing: Billing;
}

/** Liga a ocorrência ao gasto, com a forma de pagamento e a fatura daquela data. */
export function toExpenseOccurrence(
  occurrence: Occurrence,
  expense: ExpenseWithRelations,
): ExpenseOccurrence {
  const paymentMethod = paymentMethodAt(expense, occurrence.dueDate);
  return {
    ...occurrence,
    expense,
    paymentMethod,
    billing: billingOf(occurrence.dueDate, cardCycleOf(paymentMethod)),
  };
}

export function toPaymentRecord(payment: Payment): PaymentRecord {
  return {
    dueDate: fromDbDate(payment.dueDate),
    paidAmountCents: payment.paidAmountCents,
    paidAt: fromDbDate(payment.paidAt),
  };
}
