import { Barcode, CreditCard, Landmark, QrCode, Wallet, type LucideIcon } from 'lucide-react';
import type { Invoice, PaymentMethod, PaymentMethodType } from '../api/types';
import { formatDayMonth } from './format';

export const PAYMENT_METHOD_TYPES: PaymentMethodType[] = [
  'CREDIT_CARD',
  'DEBIT_CARD',
  'PIX',
  'ACCOUNT_DEBIT',
  'BOLETO',
  'OTHER',
];

export const PAYMENT_METHOD_TYPE_LABEL: Record<PaymentMethodType, string> = {
  CREDIT_CARD: 'Cartão de crédito',
  DEBIT_CARD: 'Cartão de débito',
  PIX: 'Pix',
  ACCOUNT_DEBIT: 'Débito automático',
  BOLETO: 'Boleto',
  OTHER: 'Outro',
};

export const PAYMENT_METHOD_ICON: Record<PaymentMethodType, LucideIcon> = {
  CREDIT_CARD: CreditCard,
  DEBIT_CARD: CreditCard,
  PIX: QrCode,
  ACCOUNT_DEBIT: Landmark,
  BOLETO: Barcode,
  OTHER: Wallet,
};

/** "Cartão de crédito · fecha dia 25, vence dia 5" ou só o tipo. */
export function describePaymentMethod(
  method: Pick<PaymentMethod, 'type' | 'closingDay' | 'dueDay'>,
): string {
  const label = PAYMENT_METHOD_TYPE_LABEL[method.type];
  if (method.type !== 'CREDIT_CARD' || method.closingDay === null || method.dueDay === null) {
    return label;
  }
  return `${label} · fecha dia ${method.closingDay}, vence dia ${method.dueDay}`;
}

/** "Fatura de 05/11 (fecha 25/10)" */
export function describeInvoice(invoice: Invoice): string {
  return `Fatura de ${formatDayMonth(invoice.dueDate)} (fecha ${formatDayMonth(invoice.closingDate)})`;
}

/** Nome exibido para vencimentos sem forma de pagamento. */
export const NO_PAYMENT_METHOD = 'Sem forma de pagamento';
