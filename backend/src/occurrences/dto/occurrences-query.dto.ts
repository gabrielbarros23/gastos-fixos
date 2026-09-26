import { IsCalendarDate } from '../../common/validation/is-calendar-date.decorator.js';

export const MAX_PERIOD_DAYS = 366;

export class OccurrencesQueryDto {
  /** Início do período (inclusivo). @example "2026-10-01" */
  @IsCalendarDate()
  from: string;

  /** Fim do período (inclusivo). Período máximo de 366 dias. @example "2026-10-31" */
  @IsCalendarDate()
  to: string;
}
