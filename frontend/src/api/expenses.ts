import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { invalidateFinancialData, queryKeys } from './query-keys';
import type { Amount, Expense, ExpenseDetail, Frequency } from './types';

export type ExpenseStatusFilter = 'all' | 'active' | 'inactive';

export interface ExpenseFilters {
  status: ExpenseStatusFilter;
  categoryId?: string;
}

export interface ExpenseRuleInput {
  name: string;
  description: string | null;
  categoryId: string;
  frequency: Frequency;
  interval: number;
  startDate: string;
  endDate: string | null;
  installments: number | null;
}

export interface CreateExpenseInput extends ExpenseRuleInput {
  amountCents: number;
}

export function useExpenses(filters: ExpenseFilters) {
  return useQuery({
    queryKey: queryKeys.expenseList(filters),
    queryFn: async () =>
      (
        await api.get<Expense[]>('/expenses', {
          params: { status: filters.status, categoryId: filters.categoryId || undefined },
        })
      ).data,
  });
}

export function useExpense(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.expense(id ?? ''),
    queryFn: async () => (await api.get<ExpenseDetail>(`/expenses/${id}`)).data,
    enabled: Boolean(id),
  });
}

/** Qualquer escrita em gasto afeta calendário, resumo e contagem por categoria. */
function useFinancialMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => invalidateFinancialData(queryClient),
  });
}

export function useCreateExpense() {
  return useFinancialMutation(
    async (input: CreateExpenseInput) => (await api.post<ExpenseDetail>('/expenses', input)).data,
  );
}

export function useUpdateExpense() {
  return useFinancialMutation(
    async ({ id, ...input }: ExpenseRuleInput & { id: string }) =>
      (await api.patch<ExpenseDetail>(`/expenses/${id}`, input)).data,
  );
}

export function useSetExpenseActive() {
  return useFinancialMutation(
    async ({ id, active }: { id: string; active: boolean }) =>
      (await api.post<ExpenseDetail>(`/expenses/${id}/${active ? 'activate' : 'deactivate'}`)).data,
  );
}

export function useDeleteExpense() {
  return useFinancialMutation((id: string) => api.delete(`/expenses/${id}`));
}

export function useAddAmount() {
  return useFinancialMutation(
    async ({
      expenseId,
      ...input
    }: {
      expenseId: string;
      amountCents: number;
      effectiveFrom: string;
    }) => (await api.post<Amount>(`/expenses/${expenseId}/amounts`, input)).data,
  );
}

export function useCorrectAmount() {
  return useFinancialMutation(
    async ({
      expenseId,
      amountId,
      amountCents,
    }: {
      expenseId: string;
      amountId: string;
      amountCents: number;
    }) =>
      (await api.patch<Amount>(`/expenses/${expenseId}/amounts/${amountId}`, { amountCents })).data,
  );
}

export function useRemoveAmount() {
  return useFinancialMutation(({ expenseId, amountId }: { expenseId: string; amountId: string }) =>
    api.delete(`/expenses/${expenseId}/amounts/${amountId}`),
  );
}
