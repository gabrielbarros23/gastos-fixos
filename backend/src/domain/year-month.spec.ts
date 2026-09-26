import { parseCalendarDate as d } from './calendar-date.js';
import {
  addMonthsToYearMonth,
  firstDayOf,
  isValidYearMonth,
  lastDayOf,
  monthOf,
  nextMonths,
  parseYearMonth as ym,
} from './year-month.js';

describe('year-month', () => {
  it.each(['2026-01', '2026-12'])('aceita %s', (value) => {
    expect(isValidYearMonth(value)).toBe(true);
  });

  it.each(['2026-00', '2026-13', '2026-1', '2026-01-01', ''])(
    'rejeita %s',
    (value) => {
      expect(isValidYearMonth(value)).toBe(false);
      expect(() => ym(value)).toThrow(RangeError);
    },
  );

  it('primeiro e último dia do mês, inclusive fevereiro bissexto', () => {
    expect(firstDayOf(ym('2026-02'))).toBe('2026-02-01');
    expect(lastDayOf(ym('2026-02'))).toBe('2026-02-28');
    expect(lastDayOf(ym('2028-02'))).toBe('2028-02-29');
    expect(lastDayOf(ym('2026-12'))).toBe('2026-12-31');
  });

  it('mês de uma data', () => {
    expect(monthOf(d('2026-09-30'))).toBe('2026-09');
  });

  it('soma meses atravessando o ano', () => {
    expect(addMonthsToYearMonth(ym('2026-11'), 3)).toBe('2027-02');
    expect(addMonthsToYearMonth(ym('2026-01'), -1)).toBe('2025-12');
  });

  it('os 6 meses seguintes, sem incluir o atual', () => {
    expect(nextMonths(ym('2026-09'), 6)).toEqual([
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
      '2027-03',
    ]);
  });
});
