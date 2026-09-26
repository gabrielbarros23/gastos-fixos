import { isAxiosError } from 'axios';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

/** Formato padrão de erro da API. */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: { field: string; message: string }[];
}

export function getApiError(error: unknown): ApiErrorBody | null {
  if (isAxiosError<ApiErrorBody>(error) && error.response?.data?.message) {
    return error.response.data;
  }
  return null;
}

export function errorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}

/** Mensagem amigável para exibir ao usuário. */
export function errorMessage(
  error: unknown,
  fallback = 'Algo deu errado. Tente novamente.',
): string {
  if (isAxiosError(error) && !error.response) {
    return 'Não foi possível falar com o servidor. Verifique sua conexão.';
  }
  return getApiError(error)?.message ?? fallback;
}

/**
 * Leva os erros de campo da API (`details`) para os campos do formulário,
 * para o usuário ver o erro embaixo do input certo. Retorna false se não
 * havia nenhum erro de campo aplicável.
 */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  const details = getApiError(error)?.details ?? [];
  let applied = false;
  for (const detail of details) {
    if ((fields as readonly string[]).includes(detail.field)) {
      setError(detail.field as Path<T>, { message: detail.message });
      applied = true;
    }
  }
  return applied;
}
