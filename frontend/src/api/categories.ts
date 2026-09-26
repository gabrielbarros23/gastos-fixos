import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { invalidateFinancialData, queryKeys } from './query-keys';
import type { Category } from './types';

export interface CategoryInput {
  name: string;
  color: string;
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => (await api.get<Category[]>('/categories')).data,
  });
}

export function useSaveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: CategoryInput & { id?: string }) =>
      id
        ? (await api.patch<Category>(`/categories/${id}`, input)).data
        : (await api.post<Category>('/categories', input)).data,
    // Nome/cor aparecem em gastos, calendário e resumo.
    onSuccess: () => invalidateFinancialData(queryClient),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  });
}
