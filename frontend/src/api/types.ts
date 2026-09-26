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
  createdAt: string;
  updatedAt: string;
}

export interface Amount {
  id: string;
  amountCents: number;
  effectiveFrom: string;
}

export interface ExpenseDetail extends Expense {
  amounts: Amount[];
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
  byCategory: {
    category: CategoryRef;
    expectedCents: number;
    paidCents: number;
    occurrenceCount: number;
  }[];
  projection: { month: string; expectedCents: number }[];
}
