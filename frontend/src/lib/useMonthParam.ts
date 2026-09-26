import { useSearchParams } from 'react-router';
import { currentYearMonth, isValidYearMonth, type YearMonth } from './dates';

/**
 * Mês exibido guardado na URL (`?mes=2026-10`): o botão voltar do navegador
 * funciona e dá para compartilhar o link. Sem o parâmetro, é o mês atual.
 */
export function useMonthParam(): [YearMonth, (month: YearMonth) => void] {
  const [params, setParams] = useSearchParams();
  const param = params.get('mes');
  const month = isValidYearMonth(param) ? param : currentYearMonth();
  const setMonth = (next: YearMonth) => setParams(next === currentYearMonth() ? {} : { mes: next });
  return [month, setMonth];
}
