import {
  compareDates,
  daysInMonth,
  fromParts,
  type CalendarDate,
} from './calendar-date.js';
import { addMonthsToYearMonth, monthOf, type YearMonth } from './year-month.js';

/** Ciclo da fatura de um cartão de crédito (dias de 1 a 31). */
export interface CardCycle {
  closingDay: number;
  dueDay: number;
}

export interface Invoice {
  /** Dia em que a fatura fecha. */
  closingDate: CalendarDate;
  /** Dia em que a fatura vence: é quando o dinheiro sai da conta. */
  dueDate: CalendarDate;
}

/** Em qual mês uma cobrança pesa no bolso e, se for cartão, em qual fatura. */
export interface Billing {
  month: YearMonth;
  invoice: Invoice | null;
}

/** O dia `day` do mês, limitado ao último dia (fechamento 31 em fevereiro = 28/29). */
function dayOf(month: YearMonth, day: number): CalendarDate {
  const [year, m] = month.split('-').map(Number);
  return fromParts({
    year,
    month: m,
    day: Math.min(day, daysInMonth(year, m)),
  });
}

/**
 * A fatura é paga depois de fechar: se o dia de vencimento é maior que o de
 * fechamento, ela vence no mesmo mês (fecha 03, vence 10); senão, no mês
 * seguinte (fecha 25, vence 05).
 */
function dueMonthOf(closingMonth: YearMonth, cycle: CardCycle): YearMonth {
  return cycle.dueDay > cycle.closingDay
    ? closingMonth
    : addMonthsToYearMonth(closingMonth, 1);
}

/**
 * Fatura em que uma cobrança entra.
 *
 * Cobranças ANTES do dia de fechamento entram na fatura que fecha naquele mês.
 * Cobranças NO dia do fechamento ou depois já vão para a fatura seguinte (é o
 * "melhor dia de compra" dos bancos brasileiros).
 */
export function invoiceForCharge(
  chargeDate: CalendarDate,
  cycle: CardCycle,
): Invoice {
  const chargeMonth = monthOf(chargeDate);
  const closesThisMonth =
    compareDates(chargeDate, dayOf(chargeMonth, cycle.closingDay)) < 0;
  const closingMonth = closesThisMonth
    ? chargeMonth
    : addMonthsToYearMonth(chargeMonth, 1);

  return {
    closingDate: dayOf(closingMonth, cycle.closingDay),
    dueDate: dayOf(dueMonthOf(closingMonth, cycle), cycle.dueDay),
  };
}

/** A fatura que vence no mês (a inversa de `invoiceForCharge`). */
export function invoiceDueIn(month: YearMonth, cycle: CardCycle): Invoice {
  const closingMonth =
    cycle.dueDay > cycle.closingDay ? month : addMonthsToYearMonth(month, -1);
  return {
    closingDate: dayOf(closingMonth, cycle.closingDay),
    dueDate: dayOf(month, cycle.dueDay),
  };
}

/**
 * Mês em que uma cobrança conta no resumo. No cartão de crédito, é o mês em que
 * a FATURA vence; nas outras formas de pagamento (ou sem forma), o mês da própria
 * cobrança.
 */
export function billingOf(
  chargeDate: CalendarDate,
  cardCycle: CardCycle | null,
): Billing {
  if (!cardCycle) {
    return { month: monthOf(chargeDate), invoice: null };
  }
  const invoice = invoiceForCharge(chargeDate, cardCycle);
  return { month: monthOf(invoice.dueDate), invoice };
}

/**
 * Para buscar tudo o que conta num mês: uma cobrança pesa no mesmo mês ou até
 * dois meses depois (cobrança logo após o fechamento, fatura que vence no mês
 * seguinte ao fechamento). Então o mês M recebe cobranças de M-2 até M.
 */
export const MAX_BILLING_DELAY_MONTHS = 2;
