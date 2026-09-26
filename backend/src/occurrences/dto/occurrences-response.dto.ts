import { OccurrenceResponseDto } from './occurrence-response.dto.js';

export class OccurrenceDayDto {
  /** @example "2026-10-10" */
  date: string;
  /** Soma dos valores previstos do dia, em centavos */
  totalExpectedCents: number;
  /** Soma do que já foi pago dos vencimentos do dia, em centavos */
  totalPaidCents: number;
  occurrences: OccurrenceResponseDto[];
}

/** Ocorrências do período agrupadas por dia (só dias com vencimento). */
export class OccurrencesResponseDto {
  /** @example "2026-10-01" */
  from: string;
  /** @example "2026-10-31" */
  to: string;
  totalExpectedCents: number;
  totalPaidCents: number;
  days: OccurrenceDayDto[];
}
