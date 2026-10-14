import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { fieldError } from '../common/http/field-error.js';
import {
  compareDates,
  fromDbDate,
  parseCalendarDate,
  toDbDate,
} from '../domain/calendar-date.js';
import { PaymentMethodsService } from '../payment-methods/payment-methods.service.js';
import { isUniqueViolation } from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateExpensePaymentMethodDto,
  UpdateExpensePaymentMethodDto,
} from './dto/expense-payment-method.dto.js';
import { ExpensePaymentMethodResponseDto } from './dto/expense-response.dto.js';
import { ExpensesService } from './expenses.service.js';

const WITH_METHOD = { paymentMethod: true } as const;

/**
 * Histórico da forma de pagamento de um gasto, no mesmo padrão do histórico de
 * valor: trocar é INSERIR uma linha com data de vigência, então os meses
 * anteriores continuam contando na forma de pagamento antiga.
 */
@Injectable()
export class ExpensePaymentMethodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expenses: ExpensesService,
    private readonly paymentMethods: PaymentMethodsService,
  ) {}

  async list(
    userId: string,
    expenseId: string,
  ): Promise<ExpensePaymentMethodResponseDto[]> {
    const expense = await this.expenses.findOwned(userId, expenseId);
    return expense.paymentMethods.map((assignment) =>
      ExpensePaymentMethodResponseDto.from(assignment),
    );
  }

  async add(
    userId: string,
    expenseId: string,
    dto: CreateExpensePaymentMethodDto,
  ): Promise<ExpensePaymentMethodResponseDto> {
    const expense = await this.expenses.findOwned(userId, expenseId);
    if (dto.paymentMethodId) {
      await this.paymentMethods.findOwned(userId, dto.paymentMethodId);
    }

    const effectiveFrom = parseCalendarDate(dto.effectiveFrom);
    if (compareDates(effectiveFrom, fromDbDate(expense.startDate)) < 0) {
      throw fieldError(
        'effectiveFrom',
        'A vigência não pode ser anterior à data de início do gasto',
      );
    }

    try {
      const assignment = await this.prisma.expensePaymentMethod.create({
        data: {
          expenseId,
          paymentMethodId: dto.paymentMethodId,
          effectiveFrom: toDbDate(effectiveFrom),
        },
        include: WITH_METHOD,
      });
      return ExpensePaymentMethodResponseDto.from(assignment);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Já existe uma troca de forma de pagamento nesta data',
        );
      }
      throw error;
    }
  }

  async correct(
    userId: string,
    expenseId: string,
    assignmentId: string,
    dto: UpdateExpensePaymentMethodDto,
  ): Promise<ExpensePaymentMethodResponseDto> {
    await this.findAssignment(userId, expenseId, assignmentId);
    if (dto.paymentMethodId) {
      await this.paymentMethods.findOwned(userId, dto.paymentMethodId);
    }
    const assignment = await this.prisma.expensePaymentMethod.update({
      where: { id: assignmentId },
      data: { paymentMethodId: dto.paymentMethodId },
      include: WITH_METHOD,
    });
    return ExpensePaymentMethodResponseDto.from(assignment);
  }

  /** Desfaz uma troca: o período volta a usar a forma de pagamento anterior. */
  async remove(
    userId: string,
    expenseId: string,
    assignmentId: string,
  ): Promise<void> {
    await this.findAssignment(userId, expenseId, assignmentId);
    await this.prisma.expensePaymentMethod.delete({
      where: { id: assignmentId },
    });
  }

  private async findAssignment(
    userId: string,
    expenseId: string,
    assignmentId: string,
  ) {
    const expense = await this.expenses.findOwned(userId, expenseId);
    const assignment = expense.paymentMethods.find(
      ({ id }) => id === assignmentId,
    );
    if (!assignment) {
      throw new NotFoundException(
        'Registro de forma de pagamento não encontrado',
      );
    }
    return assignment;
  }
}
