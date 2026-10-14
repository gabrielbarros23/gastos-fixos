import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { invalidateFinancialData, queryKeys } from './query-keys';
import type { Occurrence, OccurrencesResponse, Summary } from './types';

export function fetchOccurrences(from: string, to: string, paymentMethodId?: string) {
  return api
    .get<OccurrencesResponse>('/occurrences', { params: { from, to, paymentMethodId } })
    .then((response) => response.data);
}

/** `paymentMethodId` ausente = todas as formas de pagamento. */
export function useOccurrences(from: string, to: string, paymentMethodId?: string) {
  return useQuery({
    queryKey: queryKeys.occurrencesRange(from, to, paymentMethodId),
    queryFn: () => fetchOccurrences(from, to, paymentMethodId),
    // Ao trocar de mês, mantém o mês anterior na tela até o novo chegar
    // (evita o calendário "piscar" vazio).
    placeholderData: keepPreviousData,
  });
}

export function useSummary(month: string) {
  return useQuery({
    queryKey: queryKeys.summaryMonth(month),
    queryFn: async () => (await api.get<Summary>('/summary', { params: { month } })).data,
    placeholderData: keepPreviousData,
  });
}

export interface MarkPaidInput {
  expenseId: string;
  dueDate: string;
  paidAmountCents?: number;
  paidAt?: string;
}

const paymentUrl = (expenseId: string, dueDate: string) =>
  `/expenses/${expenseId}/occurrences/${dueDate}/payment`;

export function useMarkPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ expenseId, dueDate, ...body }: MarkPaidInput) =>
      (await api.put<Occurrence>(paymentUrl(expenseId, dueDate), body)).data,
    onSuccess: () => invalidateFinancialData(queryClient),
  });
}

export function useUnmarkPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseId, dueDate }: { expenseId: string; dueDate: string }) =>
      api.delete(paymentUrl(expenseId, dueDate)),
    onSuccess: () => invalidateFinancialData(queryClient),
  });
}
