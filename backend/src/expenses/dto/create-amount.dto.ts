import { IsAmountCents } from '../../common/validation/is-amount-cents.decorator.js';
import { IsCalendarDate } from '../../common/validation/is-calendar-date.decorator.js';

/** Novo valor do gasto, vigente para vencimentos a partir de `effectiveFrom`. */
export class CreateAmountDto {
  @IsAmountCents()
  amountCents: number;

  /** Vencimentos nesta data ou depois usam o novo valor. @example "2026-11-01" */
  @IsCalendarDate()
  effectiveFrom: string;
}
