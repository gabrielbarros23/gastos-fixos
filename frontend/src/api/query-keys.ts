import type { QueryClient } from '@tanstack/react-query';

/** Chaves do cache do React Query, num lugar só. */
export const queryKeys = {
  categories: ['categories'] as const,
  expenses: ['expenses'] as const,
  expenseList: (filters: object) => ['expenses', 'list', filters] as const,
  expense: (id: string) => ['expenses', 'detail', id] as const,
  occurrences: ['occurrences'] as const,
  occurrencesRange: (from: string, to: string) => ['occurrences', from, to] as const,
  summary: ['summary'] as const,
  summaryMonth: (month: string) => ['summary', month] as const,
};

/**
 * Quase toda escrita muda os números do calendário e do resumo (que são
 * calculados a partir de gastos, valores e pagamentos). Em vez de adivinhar
 * quais meses mudaram, invalidamos as listas; o React Query só busca de novo
 * o que estiver na tela.
 */
export function invalidateFinancialData(queryClient: QueryClient): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses }),
    queryClient.invalidateQueries({ queryKey: queryKeys.occurrences }),
    queryClient.invalidateQueries({ queryKey: queryKeys.summary }),
    queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  ]).then(() => undefined);
}
