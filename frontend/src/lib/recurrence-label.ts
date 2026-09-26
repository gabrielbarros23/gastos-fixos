import type { Frequency } from '../api/types';
import { weekdayName } from './dates';
import { formatDayMonth } from './format';

const MONTHLY_NAMES: Record<number, string> = {
  1: 'Mensal',
  2: 'Bimestral',
  3: 'Trimestral',
  6: 'Semestral',
  12: 'Anual',
};

/** Descrição curta da regra: "Mensal · dia 10", "Toda segunda", "Anual · 20/03". */
export function describeRecurrence(rule: {
  frequency: Frequency;
  interval: number;
  startDate: string;
}): string {
  const { frequency, interval, startDate } = rule;
  const day = Number(startDate.slice(8, 10));

  if (frequency === 'WEEKLY') {
    const weekday = weekdayName(startDate);
    if (interval === 1) {
      const article = weekday === 'sábado' || weekday === 'domingo' ? 'Todo' : 'Toda';
      return `${article} ${weekday}`;
    }
    return `A cada ${interval} semanas · ${weekday}`;
  }

  if (frequency === 'MONTHLY') {
    const name = MONTHLY_NAMES[interval] ?? `A cada ${interval} meses`;
    // Dia 29-31: em meses mais curtos, cai no último dia do mês.
    const dayLabel = day >= 29 ? `dia ${day} (ou último dia)` : `dia ${day}`;
    return `${name} · ${dayLabel}`;
  }

  const name = interval === 1 ? 'Anual' : `A cada ${interval} anos`;
  return `${name} · ${formatDayMonth(startDate)}`;
}

export const FREQUENCY_UNIT: Record<Frequency, [singular: string, plural: string]> = {
  WEEKLY: ['semana', 'semanas'],
  MONTHLY: ['mês', 'meses'],
  YEARLY: ['ano', 'anos'],
};
