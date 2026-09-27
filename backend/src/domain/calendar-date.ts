/**
 * Datas "de calendário" (dia/mês/ano, sem hora e sem fuso), como um vencimento.
 *
 * Representadas como string `YYYY-MM-DD` com um "brand" de tipo: o compilador
 * impede passar uma string qualquer ou um `Date` onde se espera uma data de
 * calendário. Toda a aritmética usa só funções UTC do `Date`, então o resultado
 * não depende do fuso do servidor. O fuso só entra em `todayIn`, para responder
 * "que dia é hoje em São Paulo?".
 */
export type CalendarDate = string & { readonly __brand: 'CalendarDate' };

export interface DateParts {
  year: number;
  /* 1 a 12 */
  month: number;
  day: number;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  // Dia 0 do mês seguinte = último dia deste mês.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidCalendarDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  return (
    month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
  );
}

/** Valida e converte `YYYY-MM-DD`. Datas inexistentes (ex.: 2026-02-30) são rejeitadas. */
export function parseCalendarDate(value: string): CalendarDate {
  if (!isValidCalendarDate(value)) {
    throw new RangeError(`Data de calendário inválida: "${value}"`);
  }
  return value as CalendarDate;
}

export function toParts(date: CalendarDate): DateParts {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

/** Monta uma data a partir de partes já válidas (uso interno das funções de aritmética). */
export function fromParts({ year, month, day }: DateParts): CalendarDate {
  const yyyy = String(year).padStart(4, '0');
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}` as CalendarDate;
}

function toEpochDays(date: CalendarDate): number {
  const { year, month, day } = toParts(date);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function fromEpochDays(epochDays: number): CalendarDate {
  const d = new Date(epochDays * DAY_MS);
  return fromParts({
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  });
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  return fromEpochDays(toEpochDays(date) + days);
}

/**
 * Soma meses mantendo o dia, limitado ao último dia do mês de destino:
 * 31/01 + 1 mês = 28/02 (ou 29/02 em ano bissexto).
 *
 * Atenção: o limite NÃO é "memorizado". Por isso a recorrência sempre soma a
 * partir da data âncora (31/01 + 2 meses = 31/03), e nunca encadeia a partir
 * da ocorrência anterior (28/02 + 1 mês = 28/03, o que seria um bug).
 */
export function addMonthsClamped(
  date: CalendarDate,
  months: number,
): CalendarDate {
  const { year, month, day } = toParts(date);
  const zeroBasedTotal = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(zeroBasedTotal / 12);
  const targetMonth = (zeroBasedTotal % 12) + 1;
  return fromParts({
    year: targetYear,
    month: targetMonth,
    day: Math.min(day, daysInMonth(targetYear, targetMonth)),
  });
}

/** Negativo se a < b, zero se iguais, positivo se a > b. */
export function compareDates(a: CalendarDate, b: CalendarDate): number {
  // O formato YYYY-MM-DD com ano de 4 dígitos ordena corretamente como texto.
  return a < b ? -1 : a > b ? 1 : 0;
}

export function minDate(a: CalendarDate, b: CalendarDate): CalendarDate {
  return compareDates(a, b) <= 0 ? a : b;
}

export function maxDate(a: CalendarDate, b: CalendarDate): CalendarDate {
  return compareDates(a, b) >= 0 ? a : b;
}

/** Quantos dias de `from` até `to` (negativo se `to` for anterior). */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return toEpochDays(to) - toEpochDays(from);
}

/** Diferença em meses de calendário, ignorando o dia (jan → mar = 2). */
export function monthsBetween(from: CalendarDate, to: CalendarDate): number {
  const a = toParts(from);
  const b = toParts(to);
  return (b.year - a.year) * 12 + (b.month - a.month);
}

/** Data de hoje num fuso IANA (ex.: "America/Sao_Paulo"). */
export function todayIn(
  timeZone: string,
  now: Date = new Date(),
): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>(
    Number(parts.find((part) => 
      (part.type === type))?.value
    )
  );

  return fromParts({ year: get('year'), month: get('month'), day: get('day') });
}

/**
 * Conversões na fronteira com o banco: o Prisma representa colunas `date` como
 * `Date` à meia-noite UTC. Só estas duas funções lidam com esse detalhe.
 */
export function toDbDate(date: CalendarDate): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function fromDbDate(date: Date): CalendarDate {
  return date.toISOString().slice(0, 10) as CalendarDate;
}
