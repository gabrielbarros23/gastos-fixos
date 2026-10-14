import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service.js';
import { Clock } from '../common/clock/clock.service.js';
import { fieldError } from '../common/http/field-error.js';
import {
  compareDates,
  fromDbDate,
  parseCalendarDate,
  toDbDate,
  type CalendarDate,
} from '../domain/calendar-date.js';
import {
  endDateForInstallments,
  type Frequency,
} from '../domain/recurrence.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PaymentMethodsService } from '../payment-methods/payment-methods.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import {
  ExpenseDetailResponseDto,
  ExpenseResponseDto,
} from './dto/expense-response.dto.js';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';
import {
  EXPENSE_INCLUDE,
  type ExpenseWithRelations,
} from './expense-schedule.js';

const optionalDate = (value: string | null | undefined) =>
  value ? parseCalendarDate(value) : null;

const optionalDbDate = (value: Date | null) =>
  value ? fromDbDate(value) : null;

interface EndRuleInput {
  frequency: Frequency;
  interval: number;
  startDate: CalendarDate;
  endDate: CalendarDate | null;
  installments: number | null;
}

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
    private readonly paymentMethods: PaymentMethodsService,
    private readonly clock: Clock,
  ) {}

  async list(
    userId: string,
    query: ListExpensesQueryDto,
  ): Promise<ExpenseResponseDto[]> {
    const where: Prisma.ExpenseWhereInput = { userId };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.status === 'active') where.deactivatedAt = null;
    if (query.status === 'inactive') where.deactivatedAt = { not: null };

    const expenses = await this.prisma.expense.findMany({
      where,
      include: EXPENSE_INCLUDE,
      orderBy: { name: 'asc' },
    });
    const today = this.clock.today();
    return expenses.map((expense) => ExpenseResponseDto.from(expense, today));
  }

  async get(userId: string, id: string): Promise<ExpenseDetailResponseDto> {
    return this.toDetail(await this.findOwned(userId, id));
  }

  async create(
    userId: string,
    dto: CreateExpenseDto,
  ): Promise<ExpenseDetailResponseDto> {
    await this.categories.assertOwned(userId, dto.categoryId);
    if (dto.paymentMethodId) {
      await this.paymentMethods.findOwned(userId, dto.paymentMethodId);
    }

    const startDate = parseCalendarDate(dto.startDate);
    const end = this.resolveEnd({
      frequency: dto.frequency,
      interval: dto.interval ?? 1,
      startDate,
      endDate: optionalDate(dto.endDate),
      installments: dto.installments ?? null,
    });

    const expense = await this.prisma.expense.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description ?? null,
        frequency: dto.frequency,
        interval: dto.interval ?? 1,
        startDate: toDbDate(startDate),
        endDate: end.endDate ? toDbDate(end.endDate) : null,
        installmentCount: end.installmentCount,
        // Invariante: o primeiro valor vale a partir do primeiro vencimento.
        amounts: {
          create: {
            amountCents: dto.amountCents,
            effectiveFrom: toDbDate(startDate),
          },
        },
        paymentMethods: dto.paymentMethodId
          ? {
              create: {
                paymentMethodId: dto.paymentMethodId,
                effectiveFrom: toDbDate(startDate),
              },
            }
          : undefined,
      },
      include: EXPENSE_INCLUDE,
    });
    return this.toDetail(expense);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateExpenseDto,
  ): Promise<ExpenseDetailResponseDto> {
    const current = await this.findOwned(userId, id);
    if (dto.categoryId) {
      await this.categories.assertOwned(userId, dto.categoryId);
    }

    const currentStart = fromDbDate(current.startDate);
    const startDate = dto.startDate
      ? parseCalendarDate(dto.startDate)
      : currentStart;
    const startChanged = startDate !== currentStart;

    // Mesclar o fim da série: quem vier na requisição ganha. endDate explícito
    // desfaz o parcelamento; installments explícito recalcula a data de fim.
    const installments =
      dto.installments !== undefined
        ? dto.installments
        : dto.endDate !== undefined
          ? null
          : current.installmentCount;
    const endDate =
      dto.endDate !== undefined
        ? optionalDate(dto.endDate)
        : optionalDbDate(current.endDate);

    const end = this.resolveEnd({
      frequency: dto.frequency ?? current.frequency,
      interval: dto.interval ?? current.interval,
      startDate,
      endDate,
      installments,
    });

    // Invariante do histórico: o valor inicial vale a partir do startDate.
    // Se o início mudar, o valor inicial acompanha, mas não pode "pular" uma
    // mudança de preço já registrada.
    const [initialAmount, firstChange] = current.amounts;
    if (
      startChanged &&
      firstChange &&
      compareDates(startDate, fromDbDate(firstChange.effectiveFrom)) >= 0
    ) {
      throw fieldError(
        'startDate',
        `A data de início precisa ser anterior à primeira mudança de valor (${fromDbDate(firstChange.effectiveFrom)})`,
      );
    }

    // A forma de pagamento escolhida desde o início também acompanha o início,
    // senão os novos primeiros vencimentos ficariam "sem forma de pagamento".
    // Se ela foi definida depois do início, ou se mover passaria da troca
    // seguinte, o histórico fica como está.
    const [firstMethod, secondMethod] = current.paymentMethods;
    const moveFirstMethod =
      startChanged &&
      firstMethod !== undefined &&
      fromDbDate(firstMethod.effectiveFrom) === currentStart &&
      (!secondMethod ||
        compareDates(startDate, fromDbDate(secondMethod.effectiveFrom)) < 0);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.expenseAmount.update({
        where: { id: initialAmount.id },
        data: { effectiveFrom: toDbDate(startDate) },
      });
      if (moveFirstMethod) {
        await tx.expensePaymentMethod.update({
          where: { id: firstMethod.id },
          data: { effectiveFrom: toDbDate(startDate) },
        });
      }
      return tx.expense.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          categoryId: dto.categoryId,
          frequency: dto.frequency,
          interval: dto.interval,
          startDate: toDbDate(startDate),
          endDate: end.endDate ? toDbDate(end.endDate) : null,
          installmentCount: end.installmentCount,
        },
        include: EXPENSE_INCLUDE,
      });
    });
    return this.toDetail(updated);
  }

  /** Cancela a partir de hoje: vencimentos anteriores continuam existindo. */
  async deactivate(
    userId: string,
    id: string,
  ): Promise<ExpenseDetailResponseDto> {
    const expense = await this.findOwned(userId, id);
    if (expense.deactivatedAt) {
      return this.toDetail(expense); // idempotente: mantém a data original
    }
    return this.toDetail(
      await this.prisma.expense.update({
        where: { id },
        data: { deactivatedAt: toDbDate(this.clock.today()) },
        include: EXPENSE_INCLUDE,
      }),
    );
  }

  async activate(
    userId: string,
    id: string,
  ): Promise<ExpenseDetailResponseDto> {
    await this.findOwned(userId, id);
    return this.toDetail(
      await this.prisma.expense.update({
        where: { id },
        data: { deactivatedAt: null },
        include: EXPENSE_INCLUDE,
      }),
    );
  }

  /** Exclusão definitiva (histórico de valores vai junto, em cascata). */
  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    await this.prisma.expense.delete({ where: { id } });
  }

  /**
   * Busca o gasto garantindo que é do usuário. De outro usuário responde 404
   * (e não 403), para não revelar que o ID existe.
   */
  async findOwned(userId: string, id: string): Promise<ExpenseWithRelations> {
    const expense = await this.prisma.expense.findFirst({
      where: { id, userId },
      include: EXPENSE_INCLUDE,
    });
    if (!expense) {
      throw new NotFoundException('Gasto não encontrado');
    }
    return expense;
  }

  toDetail(expense: ExpenseWithRelations): ExpenseDetailResponseDto {
    return ExpenseDetailResponseDto.from(expense, this.clock.today());
  }

  /** Resolve a data de fim: calculada pelas parcelas ou validada contra o início. */
  private resolveEnd(input: EndRuleInput): {
    endDate: CalendarDate | null;
    installmentCount: number | null;
  } {
    if (input.installments) {
      return {
        endDate: endDateForInstallments(input, input.installments),
        installmentCount: input.installments,
      };
    }
    if (input.endDate && compareDates(input.endDate, input.startDate) < 0) {
      throw fieldError(
        'endDate',
        'A data de fim não pode ser anterior à data de início',
      );
    }
    return { endDate: input.endDate, installmentCount: null };
  }
}
