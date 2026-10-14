/** Tipos das respostas da API (espelham os DTOs do backend). */

export interface User {
  id: string;
  name: string;
  email: string;
  remindersEnabled: boolean;
  reminderDaysBefore: number;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  expenseCount: number;
}

export type CategoryRef = Pick<Category, 'id' | 'name' | 'color'>;

export type PaymentMethodType =
  'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'BOLETO' | 'ACCOUNT_DEBIT' | 'OTHER';

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  color: string;
  /** Só cartão de crédito */
  closingDay: number | null;
  /** Só cartão de crédito */
  dueDay: number | null;
  /** Só cartões, opcional: 4 últimos dígitos */
  lastDigits: string | null;
  expenseCount: number;
}

export type PaymentMethodRef = Pick<PaymentMethod, 'id' | 'name' | 'type' | 'color' | 'lastDigits'>;

/** Fatura de cartão de crédito em que uma cobrança entra. */
export interface Invoice {
  closingDate: string;
  dueDate: string;
}

export type Frequency = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Expense {
  id: string;
  name: string;
  description: string | null;
  category: CategoryRef;
  frequency: Frequency;
  interval: number;
  startDate: string;
  endDate: string | null;
  installmentCount: number | null;
  isActive: boolean;
  deactivatedAt: string | null;
  currentAmountCents: number;
  nextDueDate: string | null;
  /** Forma de pagamento vigente hoje */
  paymentMethod: PaymentMethodRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface Amount {
  id: string;
  amountCents: number;
  effectiveFrom: string;
}

/** Registro do histórico: a partir de effectiveFrom, usa paymentMethod (null = sem forma). */
export interface ExpensePaymentMethod {
  id: string;
  paymentMethod: PaymentMethodRef | null;
  effectiveFrom: string;
}

export interface ExpenseDetail extends Expense {
  amounts: Amount[];
  paymentMethods: ExpensePaymentMethod[];
}

export type OccurrenceStatus = 'PAID' | 'PENDING' | 'OVERDUE';

export interface Occurrence {
  expenseId: string;
  name: string;
  category: CategoryRef;
  dueDate: string;
  expectedAmountCents: number;
  installment: { number: number; total: number } | null;
  status: OccurrenceStatus;
  payment: { paidAmountCents: number; paidAt: string } | null;
  paymentMethod: PaymentMethodRef | null;
  /** Mês em que a cobrança pesa (no cartão, o do vencimento da fatura) */
  billingMonth: string;
  invoice: Invoice | null;
}

export interface OccurrenceDay {
  date: string;
  totalExpectedCents: number;
  totalPaidCents: number;
  occurrences: Occurrence[];
}

export interface OccurrencesResponse {
  from: string;
  to: string;
  totalExpectedCents: number;
  totalPaidCents: number;
  days: OccurrenceDay[];
}

export interface Summary {
  month: string;
  expectedCents: number;
  paidCents: number;
  pendingCents: number;
  overdueCents: number;
  occurrenceCount: number;
  paidCount: number;
  /** Quanto cada forma de pagamento cobra no mês ("sem forma" por último) */
  byPaymentMethod: {
    paymentMethod: PaymentMethodRef | null;
    invoice: Invoice | null;
    expectedCents: number;
    paidCents: number;
    pendingCents: number;
    occurrenceCount: number;
  }[];
  byCategory: {
    category: CategoryRef;
    expectedCents: number;
    paidCents: number;
    occurrenceCount: number;
  }[];
  projection: {
    month: string;
    expectedCents: number;
    byPaymentMethod: { paymentMethod: PaymentMethodRef | null; expectedCents: number }[];
  }[];
}
