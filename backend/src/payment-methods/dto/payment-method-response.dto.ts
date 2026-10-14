import { ApiProperty } from '@nestjs/swagger';
import type {
  PaymentMethod,
  PaymentMethodType,
} from '../../generated/prisma/client.js';
import { PAYMENT_METHOD_TYPES } from './create-payment-method.dto.js';

/** Forma de pagamento resumida, embutida em gastos, vencimentos e resumo. */
export class PaymentMethodRefDto {
  id: string;
  /** @example "Nubank" */
  name: string;
  @ApiProperty({ enum: PAYMENT_METHOD_TYPES })
  type: PaymentMethodType;
  /** @example "#8A05BE" */
  color: string;
  /** 4 últimos dígitos do cartão, se informados @example "4821" */
  lastDigits: string | null;

  static from(method: PaymentMethod): PaymentMethodRefDto {
    return {
      id: method.id,
      name: method.name,
      type: method.type,
      color: method.color,
      lastDigits: method.lastDigits,
    };
  }
}

export class PaymentMethodResponseDto extends PaymentMethodRefDto {
  /** Dia de fechamento da fatura (só cartão de crédito) @example 25 */
  closingDay: number | null;
  /** Dia de vencimento da fatura (só cartão de crédito) @example 5 */
  dueDay: number | null;
  /** Quantos gastos usam ou já usaram esta forma de pagamento */
  expenseCount: number;

  static override from(
    method: PaymentMethod,
    expenseCount = 0,
  ): PaymentMethodResponseDto {
    return {
      ...PaymentMethodRefDto.from(method),
      closingDay: method.closingDay,
      dueDay: method.dueDay,
      expenseCount,
    };
  }
}
