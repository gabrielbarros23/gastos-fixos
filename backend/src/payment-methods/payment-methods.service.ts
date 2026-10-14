import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { fieldError } from '../common/http/field-error.js';
import type {
  PaymentMethod,
  PaymentMethodType,
  Prisma,
} from '../generated/prisma/client.js';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto.js';
import { PaymentMethodResponseDto } from './dto/payment-method-response.dto.js';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto.js';

function duplicateName(): ConflictException {
  return new ConflictException(
    'Já existe uma forma de pagamento com esse nome',
  );
}

/**
 * Cartão de crédito precisa dos dias de fechamento e vencimento da fatura; as
 * outras formas não têm fatura. (O banco garante o mesmo com um CHECK.)
 */
function resolveCycle(
  type: PaymentMethodType,
  closingDay: number | null,
  dueDay: number | null,
): { closingDay: number | null; dueDay: number | null } {
  if (type === 'CREDIT_CARD') {
    if (closingDay === null) {
      throw fieldError('closingDay', 'Informe o dia de fechamento da fatura');
    }
    if (dueDay === null) {
      throw fieldError('dueDay', 'Informe o dia de vencimento da fatura');
    }
    return { closingDay, dueDay };
  }
  if (closingDay !== null || dueDay !== null) {
    throw fieldError(
      closingDay !== null ? 'closingDay' : 'dueDay',
      'Dias de fechamento e vencimento só valem para cartão de crédito',
    );
  }
  return { closingDay: null, dueDay: null };
}

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<PaymentMethodResponseDto[]> {
    const [methods, counts] = await Promise.all([
      this.prisma.paymentMethod.findMany({
        where: { userId },
        orderBy: { name: 'asc' },
      }),
      this.expenseCounts({ paymentMethod: { userId } }),
    ]);
    return methods.map((method) =>
      PaymentMethodResponseDto.from(method, counts.get(method.id)),
    );
  }

  async create(
    userId: string,
    dto: CreatePaymentMethodDto,
  ): Promise<PaymentMethodResponseDto> {
    const cycle = resolveCycle(
      dto.type,
      dto.closingDay ?? null,
      dto.dueDay ?? null,
    );
    try {
      const method = await this.prisma.paymentMethod.create({
        data: {
          userId,
          name: dto.name,
          type: dto.type,
          color: dto.color,
          ...cycle,
        },
      });
      return PaymentMethodResponseDto.from(method);
    } catch (error) {
      if (isUniqueViolation(error)) throw duplicateName();
      throw error;
    }
  }

  async update(
    userId: string,
    id: string,
    dto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethodResponseDto> {
    const current = await this.findOwned(userId, id);
    const type = dto.type ?? current.type;
    // Continua (ou vira) cartão: o que não veio na requisição fica como estava.
    // Deixa de ser cartão: os dias somem, a menos que a requisição insista neles.
    const keepCurrent = type === 'CREDIT_CARD';
    const cycle = resolveCycle(
      type,
      dto.closingDay !== undefined
        ? dto.closingDay
        : keepCurrent
          ? current.closingDay
          : null,
      dto.dueDay !== undefined
        ? dto.dueDay
        : keepCurrent
          ? current.dueDay
          : null,
    );

    try {
      const method = await this.prisma.paymentMethod.update({
        where: { id },
        data: { name: dto.name, color: dto.color, type, ...cycle },
      });
      const counts = await this.expenseCounts({ paymentMethodId: id });
      return PaymentMethodResponseDto.from(method, counts.get(id));
    } catch (error) {
      if (isUniqueViolation(error)) throw duplicateName();
      throw error;
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    try {
      await this.prisma.paymentMethod.delete({ where: { id } });
    } catch (error) {
      // Mesma ideia das categorias: quem garante é a FK com RESTRICT.
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(
          'Esta forma de pagamento está no histórico de algum gasto. Remova-a dos gastos antes de excluir.',
        );
      }
      throw error;
    }
  }

  /**
   * Garante que a forma de pagamento existe E pertence ao usuário. De outro
   * usuário responde 404 (e não 403), para não revelar que o ID existe.
   */
  async findOwned(userId: string, id: string): Promise<PaymentMethod> {
    const method = await this.prisma.paymentMethod.findFirst({
      where: { id, userId },
    });
    if (!method) {
      throw new NotFoundException('Forma de pagamento não encontrada');
    }
    return method;
  }

  /** Quantos gastos DIFERENTES usam ou já usaram cada forma de pagamento. */
  private async expenseCounts(
    where: Prisma.ExpensePaymentMethodWhereInput,
  ): Promise<Map<string, number>> {
    const rows = await this.prisma.expensePaymentMethod.findMany({
      where,
      distinct: ['paymentMethodId', 'expenseId'],
      select: { paymentMethodId: true },
    });
    const counts = new Map<string, number>();
    for (const { paymentMethodId } of rows) {
      if (paymentMethodId) {
        counts.set(paymentMethodId, (counts.get(paymentMethodId) ?? 0) + 1);
      }
    }
    return counts;
  }
}
