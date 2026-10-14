import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ConflictsWith } from '../../common/validation/conflicts-with.decorator.js';
import { IsAmountCents } from '../../common/validation/is-amount-cents.decorator.js';
import { IsCalendarDate } from '../../common/validation/is-calendar-date.decorator.js';
import { Trim, TrimToNull } from '../../common/validation/transformers.js';
import { FREQUENCIES, type Frequency } from '../../domain/recurrence.js';

export const MAX_INTERVAL = 24;
export const MAX_INSTALLMENTS = 360;

export class CreateExpenseDto {
  /** @example "Netflix" */
  @Trim()
  @IsString()
  @Length(1, 100, { message: 'O nome deve ter entre 1 e 100 caracteres' })
  name: string;

  /** @example "Plano padrão" */
  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(500, { message: 'A descrição deve ter no máximo 500 caracteres' })
  description?: string | null;

  @IsUUID('all', { message: 'categoryId deve ser um UUID' })
  categoryId: string;

  /**
   * Forma de pagamento (opcional), vigente desde o startDate. Para trocar
   * depois, use POST /expenses/:id/payment-methods.
   */
  @IsOptional()
  @IsUUID('all', { message: 'paymentMethodId deve ser um UUID' })
  paymentMethodId?: string | null;

  /** Valor inicial, vigente a partir do startDate */
  @IsAmountCents()
  amountCents: number;

  @ApiProperty({ enum: FREQUENCIES, example: 'MONTHLY' })
  @IsIn(FREQUENCIES, {
    message: 'frequency deve ser WEEKLY, MONTHLY ou YEARLY',
  })
  frequency: Frequency;

  /** A cada quantas semanas/meses/anos (3 + MONTHLY = trimestral). @example 1 */
  @IsOptional()
  @IsInt({ message: 'interval deve ser um número inteiro' })
  @Min(1, { message: 'interval deve ser no mínimo 1' })
  @Max(MAX_INTERVAL, { message: `interval deve ser no máximo ${MAX_INTERVAL}` })
  interval?: number;

  /** Primeiro vencimento; define o dia de todos os seguintes. @example "2026-10-10" */
  @IsCalendarDate()
  startDate: string;

  /** Último vencimento possível (inclusivo). Não combine com installments. @example "2027-09-10" */
  @IsOptional()
  @IsCalendarDate()
  @ConflictsWith('installments', {
    message: 'Informe a data de fim OU o número de parcelas, não os dois',
  })
  endDate?: string | null;

  /** Número de parcelas; a data de fim é calculada. @example 12 */
  @IsOptional()
  @IsInt({ message: 'installments deve ser um número inteiro' })
  @Min(1, { message: 'installments deve ser no mínimo 1' })
  @Max(MAX_INSTALLMENTS, {
    message: `installments deve ser no máximo ${MAX_INSTALLMENTS}`,
  })
  installments?: number | null;
}
