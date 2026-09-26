import { IsOptional } from 'class-validator';
import { IsYearMonth } from '../../common/validation/is-year-month.decorator.js';
import { ExpenseCategoryDto } from '../../expenses/dto/expense-response.dto.js';

export class SummaryQueryDto {
  /** Mês do resumo; padrão = mês atual. @example "2026-10" */
  @IsOptional()
  @IsYearMonth()
  month?: string;
}

export class CategorySummaryDto {
  category: ExpenseCategoryDto;
  expectedCents: number;
  paidCents: number;
  occurrenceCount: number;
}

export class MonthProjectionDto {
  /** @example "2026-11" */
  month: string;
  expectedCents: number;
}

/**
 * Previsto x realizado de um mês. Um pagamento conta no mês do VENCIMENTO
 * (competência), não no mês em que foi pago.
 */
export class SummaryResponseDto {
  /** @example "2026-10" */
  month: string;
  /** Soma dos valores previstos do mês, pagos ou não */
  expectedCents: number;
  /** Soma do que foi efetivamente pago (pode diferir do previsto) */
  paidCents: number;
  /** Previsto dos vencimentos ainda não pagos (inclui os atrasados) */
  pendingCents: number;
  /** Previsto dos vencimentos não pagos que já passaram */
  overdueCents: number;
  occurrenceCount: number;
  paidCount: number;
  /** Gastos do mês por categoria, do maior para o menor previsto */
  byCategory: CategorySummaryDto[];
  /** Total previsto de cada um dos 6 meses seguintes */
  projection: MonthProjectionDto[];
}
