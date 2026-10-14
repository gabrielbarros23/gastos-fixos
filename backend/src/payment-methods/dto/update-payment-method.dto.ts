import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
import {
  HEX_COLOR,
  NormalizeColor,
} from '../../categories/dto/create-category.dto.js';
import { IsOptionalNotNull } from '../../common/validation/is-optional-not-null.decorator.js';
import { Trim } from '../../common/validation/transformers.js';
import type { PaymentMethodType } from '../../generated/prisma/enums.js';
import {
  IsDayOfMonth,
  IsLastDigits,
  PAYMENT_METHOD_TYPES,
  TYPE_MESSAGE,
} from './create-payment-method.dto.js';

/**
 * Todos os campos são opcionais. Ao deixar de ser cartão de crédito, os dias da
 * fatura são apagados; ao virar cartão, precisam ser informados.
 */
export class UpdatePaymentMethodDto {
  /** @example "Nubank" */
  @IsOptionalNotNull()
  @Trim()
  @IsString()
  @Length(1, 50, { message: 'O nome deve ter entre 1 e 50 caracteres' })
  name?: string;

  @ApiProperty({ enum: PAYMENT_METHOD_TYPES, required: false })
  @IsOptionalNotNull()
  @IsIn(PAYMENT_METHOD_TYPES, { message: TYPE_MESSAGE })
  type?: PaymentMethodType;

  /** @example "#8A05BE" */
  @IsOptionalNotNull()
  @NormalizeColor()
  @IsString()
  @Matches(HEX_COLOR, { message: 'A cor deve estar no formato #RRGGBB' })
  color?: string;

  /** @example 25 */
  @IsOptional()
  @IsDayOfMonth('closingDay')
  closingDay?: number | null;

  /** @example 5 */
  @IsOptional()
  @IsDayOfMonth('dueDay')
  dueDay?: number | null;

  /** null ou "" apaga. @example "4821" */
  @IsLastDigits()
  lastDigits?: string | null;
}
