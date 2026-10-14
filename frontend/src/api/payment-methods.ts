import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { invalidateFinancialData, queryKeys } from './query-keys';
import type { PaymentMethod, PaymentMethodType } from './types';

export interface PaymentMethodInput {
  name: string;
  type: PaymentMethodType;
  color: string;
  closingDay: number | null;
  dueDay: number | null;
  lastDigits: string | null;
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: queryKeys.paymentMethods,
    queryFn: async () => (await api.get<PaymentMethod[]>('/payment-methods')).data,
  });
}

export function useSavePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: PaymentMethodInput & { id?: string }) =>
      id
        ? (await api.patch<PaymentMethod>(`/payment-methods/${id}`, input)).data
        : (await api.post<PaymentMethod>('/payment-methods', input)).data,
    // Mudar os dias da fatura muda em qual mês cada cobrança pesa.
    onSuccess: () => invalidateFinancialData(queryClient),
  });
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/payment-methods/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods }),
  });
}
