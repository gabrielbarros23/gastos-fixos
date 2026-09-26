import { describe, expect, it } from 'vitest';
import { formatCents, formatDate, formatDayMonth, pluralize } from './format';
import { centsFromTyped } from './money';
import { formatYearMonth, monthGrid, shiftYearMonth } from './dates';

describe('formatCents', () => {
  it.each([
    [0, 'R$ 0,00'],
    [5, 'R$ 0,05'],
    [5990, 'R$ 59,90'],
    [123456, 'R$ 1.234,56'],
    [100000000, 'R$ 1.000.000,00'],
  ])('%i → %s', (cents, expected) => {
    expect(formatCents(cents)).toBe(expected);
  });
});

describe('formatDate', () => {
  it('troca para dd/mm/aaaa sem passar por Date (sem risco de fuso)', () => {
    expect(formatDate('2026-10-05')).toBe('05/10/2026');
    expect(formatDayMonth('2026-01-31')).toBe('31/01');
  });
});

describe('centsFromTyped', () => {
  it.each([
    ['', 0],
    ['5', 5],
    ['59', 59],
    ['5990', 5990],
    ['R$ 59,90', 5990], // colar um valor formatado também funciona
    ['1.234,56', 123456],
    ['999999999999', 100000000], // limitado ao teto da API
  ])('"%s" → %i centavos', (typed, expected) => {
    expect(centsFromTyped(typed)).toBe(expected);
  });
});

describe('datas do calendário', () => {
  it('grade de fevereiro/2026: começa no domingo 01/02 e vai até 28/02', () => {
    const { cells, from, to } = monthGrid('2026-02');
    expect(from).toBe('2026-02-01');
    expect(to).toBe('2026-02-28');
    expect(cells).toHaveLength(28);
  });

  it('grade de outubro/2026: completa as semanas com dias vizinhos', () => {
    const { cells, from, to } = monthGrid('2026-10');
    expect(from).toBe('2026-09-27'); // domingo antes de 01/10 (quinta)
    expect(to).toBe('2026-10-31'); // 31/10 é sábado
    expect(cells[0]).toEqual({ date: '2026-09-27', day: 27, inMonth: false });
    expect(cells.filter((c) => c.inMonth)).toHaveLength(31);
  });

  it('navega entre meses atravessando o ano', () => {
    expect(shiftYearMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftYearMonth('2026-01', -1)).toBe('2025-12');
    expect(formatYearMonth('2026-10')).toBe('outubro de 2026');
  });

  it('plural', () => {
    expect(pluralize(1, 'gasto', 'gastos')).toBe('1 gasto');
    expect(pluralize(3, 'gasto', 'gastos')).toBe('3 gastos');
  });
});
