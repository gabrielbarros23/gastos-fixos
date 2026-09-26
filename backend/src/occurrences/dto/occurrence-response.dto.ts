import { ApiProperty } from '@nestjs/swagger';
import type { CalendarDate } from '../../domain/calendar-date.js';
import {
  occurrenceStatus,
  type OccurrenceStatus,
} from '../../domain/occurrences.js';
import { ExpenseCategoryDto } from '../../expenses/dto/expense-response.dto.js';
import type { ExpenseOccurrence } from '../occurrence-source.js';

const STATUSES: OccurrenceStatus[] = ['PAID', 'PENDING', 'OVERDUE'];

export class InstallmentDto {
  /** @example 3 */
  number: number;
  /** @example 12 */
  total: number;
}

export class PaymentDto {
  /** Valor realmente pago, em centavos. @example 6200 */
  paidAmountCents: number;
  /** Data em que foi pago. @example "2026-10-09" */
  paidAt: string;
}

/**
 * Um vencimento de um gasto. Não tem `id`: é identificado pelo par
 * (expenseId, dueDate), calculado a partir da regra de recorrência.
 */
export class OccurrenceResponseDto {
  expenseId: string;
  /** Nome do gasto. @example "Netflix" */
  name: string;
  category: ExpenseCategoryDto;
  /** @example "2026-10-10" */
  dueDate: string;
  /** Valor previsto, vigente na data do vencimento. @example 5990 */
  expectedAmountCents: number;
  /** Só em gastos parcelados */
  installment: InstallmentDto | null;
  /** PAID = pago; OVERDUE = venceu e não foi pago; PENDING = a vencer */
  @ApiProperty({ enum: STATUSES })
  status: OccurrenceStatus;
  payment: PaymentDto | null;

  static from(
    occurrence: ExpenseOccurrence,
    today: CalendarDate,
  ): OccurrenceResponseDto {
    const { expense } = occurrence;
    return {
      expenseId: expense.id,
      name: expense.name,
      category: {
        id: expense.category.id,
        name: expense.category.name,
        color: expense.category.color,
      },
      dueDate: occurrence.dueDate,
      expectedAmountCents: occurrence.expectedAmountCents,
      installment: occurrence.installment,
      status: occurrenceStatus(occurrence, today),
      payment: occurrence.payment && {
        paidAmountCents: occurrence.payment.paidAmountCents,
        paidAt: occurrence.payment.paidAt,
      },
    };
  }
}
