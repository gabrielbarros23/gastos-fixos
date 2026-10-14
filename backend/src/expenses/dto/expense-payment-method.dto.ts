import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, ValidateIf } from 'class-validator';
import { IsCalendarDate } from '../../common/validation/is-calendar-date.decorator.js';

/** Obrigatório, mas pode ser null ("sem forma de pagamento"). */
const IsPaymentMethodIdOrNull = () =>
  applyDecorators(
    ApiProperty({ type: String, format: 'uuid', nullable: true }),
    ValidateIf((_object, value: unknown) => value !== null),
    IsUUID('all', { message: 'paymentMethodId deve ser um UUID ou null' }),
  );

/** Troca a forma de pagamento a partir de uma data. */
export class CreateExpensePaymentMethodDto {
  /** null = deixa de ter forma de pagamento a partir de effectiveFrom */
  @IsPaymentMethodIdOrNull()
  paymentMethodId: string | null;

  /** Vencimentos nesta data ou depois usam a nova forma. @example "2026-06-10" */
  @IsCalendarDate()
  effectiveFrom: string;
}

/**
 * Corrige um registro do histórico (escolheu o cartão errado). Diferente de
 * uma troca: muda também os vencimentos passados daquele período.
 */
export class UpdateExpensePaymentMethodDto {
  @IsPaymentMethodIdOrNull()
  paymentMethodId: string | null;
}
