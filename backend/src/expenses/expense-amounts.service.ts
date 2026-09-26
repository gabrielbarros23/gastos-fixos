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
import { isUniqueViolation } from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAmountDto } from './dto/create-amount.dto.js';
import { AmountResponseDto } from './dto/expense-response.dto.js';
import { UpdateAmountDto } from './dto/update-amount.dto.js';
import { ExpensesService } from './expenses.service.js';

/**
 * Histórico de valor. Mudar o preço é sempre INSERIR uma linha com a data de
 * vigência, nunca editar a anterior: assim os vencimentos passados continuam
 * com o valor que tinham, sem precisar de nenhuma lógica extra.
 */
@Injectable()
export class ExpenseAmountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expenses: ExpensesService,
  ) {}

  async list(userId: string, expenseId: string): Promise<AmountResponseDto[]> {
    const expense = await this.expenses.findOwned(userId, expenseId);
    return expense.amounts.map((amount) => AmountResponseDto.from(amount));
  }

  async add(
    userId: string,
    expenseId: string,
    dto: CreateAmountDto,
  ): Promise<AmountResponseDto> {
    const expense = await this.expenses.findOwned(userId, expenseId);
    const effectiveFrom = parseCalendarDate(dto.effectiveFrom);

    if (compareDates(effectiveFrom, fromDbDate(expense.startDate)) < 0) {
      throw fieldError(
        'effectiveFrom',
        'A vigência não pode ser anterior à data de início do gasto',
      );
    }

    try {
      const amount = await this.prisma.expenseAmount.create({
        data: {
          expenseId,
          amountCents: dto.amountCents,
          effectiveFrom: toDbDate(effectiveFrom),
        },
      });
      return AmountResponseDto.from(amount);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Já existe um valor com vigência nesta data',
        );
      }
      throw error;
    }
  }

  /**
   * Corrige o valor de um registro (ex.: digitou 559,00 em vez de 55,90).
   * É diferente de uma mudança de preço: aqui o valor estava ERRADO desde o
   * início, então os vencimentos já passados também devem mudar. Os pagamentos
   * não são afetados, porque guardam o valor que foi efetivamente pago.
   */
  async correct(
    userId: string,
    expenseId: string,
    amountId: string,
    dto: UpdateAmountDto,
  ): Promise<AmountResponseDto> {
    await this.findAmount(userId, expenseId, amountId);
    const amount = await this.prisma.expenseAmount.update({
      where: { id: amountId },
      data: { amountCents: dto.amountCents },
    });
    return AmountResponseDto.from(amount);
  }

  async remove(
    userId: string,
    expenseId: string,
    amountId: string,
  ): Promise<void> {
    const { amount, isInitial } = await this.findAmount(
      userId,
      expenseId,
      amountId,
    );
    if (isInitial) {
      throw new ConflictException(
        'O valor inicial não pode ser removido; use a correção de valor (PATCH) se ele estiver errado',
      );
    }
    await this.prisma.expenseAmount.delete({ where: { id: amount.id } });
  }

  private async findAmount(
    userId: string,
    expenseId: string,
    amountId: string,
  ) {
    const expense = await this.expenses.findOwned(userId, expenseId);
    const amount = expense.amounts.find(({ id }) => id === amountId);
    if (!amount) {
      throw new NotFoundException('Valor não encontrado');
    }
    return { amount, isInitial: amount.id === expense.amounts[0].id };
  }
}
