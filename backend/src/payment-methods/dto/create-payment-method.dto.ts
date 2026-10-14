import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {
  HEX_COLOR,
  NormalizeColor,
} from '../../categories/dto/create-category.dto.js';
import { Trim } from '../../common/validation/transformers.js';
import type { PaymentMethodType } from '../../generated/prisma/enums.js';

export const PAYMENT_METHOD_TYPES = [
  'CREDIT_CARD',
  'DEBIT_CARD',
  'PIX',
  'BOLETO',
  'ACCOUNT_DEBIT',
  'OTHER',
] as const satisfies readonly PaymentMethodType[];

export const TYPE_MESSAGE = `type deve ser ${PAYMENT_METHOD_TYPES.join(', ')}`;

/** Dia do mês de 1 a 31 (fechamento/vencimento da fatura). */
export const IsDayOfMonth = (field: string) =>
  applyDecorators(
    IsInt({ message: `${field} deve ser um número inteiro` }),
    Min(1, { message: `${field} deve estar entre 1 e 31` }),
    Max(31, { message: `${field} deve estar entre 1 e 31` }),
  );

export class CreatePaymentMethodDto {
  /** @example "Nubank" */
  @Trim()
  @IsString()
  @Length(1, 50, { message: 'O nome deve ter entre 1 e 50 caracteres' })
  name: string;

  @ApiProperty({ enum: PAYMENT_METHOD_TYPES, example: 'CREDIT_CARD' })
  @IsIn(PAYMENT_METHOD_TYPES, { message: TYPE_MESSAGE })
  type: PaymentMethodType;

  /** Cor em hexadecimal. @example "#8A05BE" */
  @NormalizeColor()
  @IsString()
  @Matches(HEX_COLOR, { message: 'A cor deve estar no formato #RRGGBB' })
  color: string;

  /** Só cartão de crédito (obrigatório nele): dia em que a fatura fecha. @example 25 */
  @IsOptional()
  @IsDayOfMonth('closingDay')
  closingDay?: number | null;

  /** Só cartão de crédito (obrigatório nele): dia em que a fatura vence. @example 5 */
  @IsOptional()
  @IsDayOfMonth('dueDay')
  dueDay?: number | null;
}
