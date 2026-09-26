import { ApiProperty } from '@nestjs/swagger';
import { amountAt } from '../../domain/amount-history.js';
import {
  fromDbDate,
  maxDate,
  type CalendarDate,
} from '../../domain/calendar-date.js';
import {
  FREQUENCIES,
  nextOccurrence,
  type Frequency,
} from '../../domain/recurrence.js';
import type { ExpenseAmount } from '../../generated/prisma/client.js';
import { toSchedule, type ExpenseWithRelations } from '../expense-schedule.js';

export class ExpenseCategoryDto {
  id: string;
  name: string;
  /** @example "#EC4899" */
  color: string;
}

export class AmountResponseDto {
  id: string;
  /** Centavos. @example 5590 */
  amountCents: number;
  /** @example "2026-10-10" */
  effectiveFrom: string;

  static from(amount: ExpenseAmount): AmountResponseDto {
    return {
      id: amount.id,
      amountCents: amount.amountCents,
      effectiveFrom: fromDbDate(amount.effectiveFrom),
    };
  }
}

export class ExpenseResponseDto {
  id: string;
  name: string;
  description: string | null;
  category: ExpenseCategoryDto;
  @ApiProperty({ enum: FREQUENCIES })
  frequency: Frequency;
  interval: number;
  /** @example "2026-10-10" */
  startDate: string;
  /** Último vencimento possível (inclusivo), ou null se não tem fim */
  endDate: string | null;
  installmentCount: number | null;
  /** false = desativado (cancelado a partir de deactivatedAt) */
  isActive: boolean;
  deactivatedAt: string | null;
  /** Valor vigente hoje, em centavos (ou o inicial, se ainda não começou) */
  currentAmountCents: number;
  /** Próximo vencimento a partir de hoje, ou null se a série acabou */
  nextDueDate: string | null;
  createdAt: Date;
  updatedAt: Date;

  static from(
    expense: ExpenseWithRelations,
    today: CalendarDate,
  ): ExpenseResponseDto {
    const schedule = toSchedule(expense);
    return {
      id: expense.id,
      name: expense.name,
      description: expense.description,
      category: {
        id: expense.category.id,
        name: expense.category.name,
        color: expense.category.color,
      },
      frequency: expense.frequency,
      interval: expense.interval,
      startDate: schedule.startDate,
      endDate: schedule.endDate ?? null,
      installmentCount: expense.installmentCount,
      isActive: expense.deactivatedAt === null,
      deactivatedAt: schedule.deactivatedAt ?? null,
      // Invariante: o primeiro valor vale a partir do startDate, então existe
      // valor vigente em qualquer data >= startDate.
      currentAmountCents: amountAt(
        schedule.amounts,
        maxDate(today, schedule.startDate),
      )!,
      nextDueDate: nextOccurrence(schedule, today)?.date ?? null,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }
}

export class ExpenseDetailResponseDto extends ExpenseResponseDto {
  /** Histórico de valores, do mais antigo para o mais recente */
  amounts: AmountResponseDto[];

  static override from(
    expense: ExpenseWithRelations,
    today: CalendarDate,
  ): ExpenseDetailResponseDto {
    return {
      ...ExpenseResponseDto.from(expense, today),
      amounts: expense.amounts.map((amount) => AmountResponseDto.from(amount)),
    };
  }
}
