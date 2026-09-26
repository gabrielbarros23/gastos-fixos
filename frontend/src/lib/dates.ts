import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Datas no front: a API usa strings "YYYY-MM-DD" (datas de calendário, sem
 * fuso). Quando precisamos de aritmética (montar a grade do mês), convertemos
 * para Date no fuso LOCAL com `parse`, nunca com `new Date("YYYY-MM-DD")`,
 * que interpreta a string como UTC.
 */
export type IsoDate = string;
/** "YYYY-MM" */
export type YearMonth = string;

export function toIsoDate(date: Date): IsoDate {
  return format(date, 'yyyy-MM-dd');
}

export function fromIsoDate(isoDate: IsoDate): Date {
  return parse(isoDate, 'yyyy-MM-dd', new Date());
}

export function todayIso(): IsoDate {
  return toIsoDate(new Date());
}

export function currentYearMonth(): YearMonth {
  return format(new Date(), 'yyyy-MM');
}

export function isValidYearMonth(value: string | null): value is YearMonth {
  return (
    value !== null && /^\d{4}-\d{2}$/.test(value) && isValid(parse(value, 'yyyy-MM', new Date()))
  );
}

export function shiftYearMonth(month: YearMonth, amount: number): YearMonth {
  return format(addMonths(parse(month, 'yyyy-MM', new Date()), amount), 'yyyy-MM');
}

/** "2026-10" → "outubro de 2026" */
export function formatYearMonth(month: YearMonth): string {
  return format(parse(month, 'yyyy-MM', new Date()), "MMMM 'de' yyyy", { locale: ptBR });
}

/** "2026-10" → "out" (para eixos de gráfico) */
export function formatShortMonth(month: YearMonth): string {
  return format(parse(month, 'yyyy-MM', new Date()), 'MMM', { locale: ptBR }).replace('.', '');
}

/** "2026-10-08" → "quinta-feira, 8 de outubro" */
export function formatLongDate(isoDate: IsoDate): string {
  return format(fromIsoDate(isoDate), "EEEE, d 'de' MMMM", { locale: ptBR });
}

/** "2026-10-05" → "segunda" */
export function weekdayName(isoDate: IsoDate): string {
  return format(fromIsoDate(isoDate), 'EEEE', { locale: ptBR }).replace('-feira', '');
}

export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export interface CalendarCell {
  date: IsoDate;
  day: number;
  inMonth: boolean;
}

/**
 * Grade de um mês para o calendário: semanas completas de domingo a sábado,
 * incluindo os dias do mês anterior/seguinte que completam a primeira e a
 * última semana (4 a 6 semanas, conforme o mês).
 */
export function monthGrid(month: YearMonth): {
  cells: CalendarCell[];
  from: IsoDate;
  to: IsoDate;
} {
  const first = parse(month, 'yyyy-MM', new Date());
  const start = startOfWeek(startOfMonth(first), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(first), { weekStartsOn: 0 });
  const cells = eachDayOfInterval({ start, end }).map((date) => ({
    date: toIsoDate(date),
    day: date.getDate(),
    inMonth: format(date, 'yyyy-MM') === month,
  }));
  return { cells, from: toIsoDate(start), to: toIsoDate(end) };
}

export function addDaysIso(isoDate: IsoDate, days: number): IsoDate {
  return toIsoDate(addDays(fromIsoDate(isoDate), days));
}
