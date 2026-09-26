import { IsOptional } from 'class-validator';
import { IsAmountCents } from '../../common/validation/is-amount-cents.decorator.js';
import { IsCalendarDate } from '../../common/validation/is-calendar-date.decorator.js';

/**
 * Corpo do PUT de pagamento. Os dois campos são opcionais: sem corpo, marca
 * como pago hoje com o valor previsto. Como é PUT, cada chamada substitui o
 * pagamento inteiro (campos omitidos voltam ao padrão).
 */
export class MarkPaidDto {
  /** Valor realmente pago; padrão = valor previsto do vencimento */
  @IsOptional()
  @IsAmountCents({ required: false })
  paidAmountCents?: number;

  /** Data em que foi pago; padrão = hoje. Não pode ser no futuro. @example "2026-10-09" */
  @IsOptional()
  @IsCalendarDate()
  paidAt?: string;
}
