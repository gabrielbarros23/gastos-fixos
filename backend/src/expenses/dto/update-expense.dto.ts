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
import { IsCalendarDate } from '../../common/validation/is-calendar-date.decorator.js';
import { IsOptionalNotNull } from '../../common/validation/is-optional-not-null.decorator.js';
import { Trim, TrimToNull } from '../../common/validation/transformers.js';
import { FREQUENCIES, type Frequency } from '../../domain/recurrence.js';
import { MAX_INSTALLMENTS, MAX_INTERVAL } from './create-expense.dto.js';

/**
 * Edição parcial dos dados e da regra. O VALOR não muda aqui: mudança de preço
 * é uma nova linha no histórico (POST /expenses/:id/amounts), para o passado
 * continuar com o valor antigo.
 *
 * Campos que aceitam `null` para limpar: description, endDate, installments.
 * Enviar `installments: null` sozinho deixa o gasto com data de fim fixa (a da
 * última parcela); envie também `endDate: null` para não ter fim.
 */
export class UpdateExpenseDto {
  @IsOptionalNotNull()
  @Trim()
  @IsString()
  @Length(1, 100, { message: 'O nome deve ter entre 1 e 100 caracteres' })
  name?: string;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(500, { message: 'A descrição deve ter no máximo 500 caracteres' })
  description?: string | null;

  @IsOptionalNotNull()
  @IsUUID('all', { message: 'categoryId deve ser um UUID' })
  categoryId?: string;

  @ApiProperty({ enum: FREQUENCIES, required: false })
  @IsOptionalNotNull()
  @IsIn(FREQUENCIES, {
    message: 'frequency deve ser WEEKLY, MONTHLY ou YEARLY',
  })
  frequency?: Frequency;

  @IsOptionalNotNull()
  @IsInt({ message: 'interval deve ser um número inteiro' })
  @Min(1, { message: 'interval deve ser no mínimo 1' })
  @Max(MAX_INTERVAL, { message: `interval deve ser no máximo ${MAX_INTERVAL}` })
  interval?: number;

  /** @example "2026-10-10" */
  @IsOptionalNotNull()
  @IsCalendarDate()
  startDate?: string;

  /** @example "2027-09-10" */
  @IsOptional()
  @IsCalendarDate()
  @ConflictsWith('installments', {
    message: 'Informe a data de fim OU o número de parcelas, não os dois',
  })
  endDate?: string | null;

  /** @example 12 */
  @IsOptional()
  @IsInt({ message: 'installments deve ser um número inteiro' })
  @Min(1, { message: 'installments deve ser no mínimo 1' })
  @Max(MAX_INSTALLMENTS, {
    message: `installments deve ser no máximo ${MAX_INSTALLMENTS}`,
  })
  installments?: number | null;
}
