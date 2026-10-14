import { IsOptional } from 'class-validator';
import { IsYearMonth } from '../../common/validation/is-year-month.decorator.js';
import { ExpenseCategoryDto } from '../../expenses/dto/expense-response.dto.js';
import { PaymentMethodRefDto } from '../../payment-methods/dto/payment-method-response.dto.js';
import { InvoiceDto } from './occurrence-response.dto.js';

export class SummaryQueryDto {
  /** Mês do resumo; padrão = mês atual. @example "2026-10" */
  @IsOptional()
  @IsYearMonth()
  month?: string;
}

export class PaymentMethodSummaryDto {
  /** null = vencimentos sem forma de pagamento */
  paymentMethod: PaymentMethodRefDto | null;
  /** No cartão de crédito, a fatura que vence neste mês */
  invoice: InvoiceDto | null;
  expectedCents: number;
  paidCents: number;
  /** Previsto ainda não pago */
  pendingCents: number;
  occurrenceCount: number;
}

export class CategorySummaryDto {
  category: ExpenseCategoryDto;
  expectedCents: number;
  paidCents: number;
  occurrenceCount: number;
}

export class PaymentMethodProjectionDto {
  paymentMethod: PaymentMethodRefDto | null;
  expectedCents: number;
}

export class MonthProjectionDto {
  /** @example "2026-11" */
  month: string;
  expectedCents: number;
  /** O previsto do mês dividido por forma de pagamento */
  byPaymentMethod: PaymentMethodProjectionDto[];
}

/**
 * Previsto x realizado de um mês. Cada vencimento conta no mês em que pesa no
 * bolso: no cartão de crédito, o mês em que a FATURA vence; nas outras formas
 * de pagamento, o mês do próprio vencimento (não o mês em que foi pago).
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
  /** Quanto cada forma de pagamento cobra no mês, do maior para o menor ("sem forma" por último) */
  byPaymentMethod: PaymentMethodSummaryDto[];
  /** Gastos do mês por categoria, do maior para o menor previsto */
  byCategory: CategorySummaryDto[];
  /** Total previsto de cada um dos 6 meses seguintes */
  projection: MonthProjectionDto[];
}
