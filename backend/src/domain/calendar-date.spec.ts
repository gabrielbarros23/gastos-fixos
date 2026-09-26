import {
  addDays,
  addMonthsClamped,
  compareDates,
  daysBetween,
  daysInMonth,
  fromDbDate,
  isLeapYear,
  isValidCalendarDate,
  monthsBetween,
  parseCalendarDate as d,
  toDbDate,
  todayIn,
} from './calendar-date.js';

describe('calendar-date', () => {
  describe('isLeapYear', () => {
    it.each([
      [2024, true],
      [2026, false],
      [2028, true],
      [1900, false], // divisível por 100 e não por 400
      [2000, true], // divisível por 400
    ])('%i → %s', (year, expected) => {
      expect(isLeapYear(year)).toBe(expected);
    });
  });

  describe('daysInMonth', () => {
    it.each([
      [2026, 1, 31],
      [2026, 2, 28],
      [2028, 2, 29],
      [2026, 4, 30],
      [2026, 12, 31],
    ])('%i-%i tem %i dias', (year, month, expected) => {
      expect(daysInMonth(year, month)).toBe(expected);
    });
  });

  describe('parse e validação', () => {
    it.each(['2026-01-31', '2028-02-29', '2026-12-01'])(
      'aceita %s',
      (value) => {
        expect(isValidCalendarDate(value)).toBe(true);
        expect(d(value)).toBe(value);
      },
    );

    it.each([
      '2026-02-29', // 2026 não é bissexto
      '2026-04-31',
      '2026-13-01',
      '2026-00-10',
      '2026-1-5', // sem zero à esquerda
      '05/01/2026',
      '2026-01-05T00:00:00Z',
      '',
    ])('rejeita %s', (value) => {
      expect(isValidCalendarDate(value)).toBe(false);
      expect(() => d(value)).toThrow(RangeError);
    });
  });

  describe('addDays', () => {
    it('atravessa meses e anos', () => {
      expect(addDays(d('2026-01-31'), 1)).toBe('2026-02-01');
      expect(addDays(d('2026-12-31'), 1)).toBe('2027-01-01');
      expect(addDays(d('2026-03-01'), -1)).toBe('2026-02-28');
      expect(addDays(d('2028-03-01'), -1)).toBe('2028-02-29');
    });
  });

  describe('addMonthsClamped', () => {
    it('limita o dia ao último dia do mês de destino', () => {
      expect(addMonthsClamped(d('2026-01-31'), 1)).toBe('2026-02-28');
      expect(addMonthsClamped(d('2028-01-31'), 1)).toBe('2028-02-29');
      expect(addMonthsClamped(d('2026-01-31'), 3)).toBe('2026-04-30');
    });

    it('não "memoriza" o limite: somar a partir da âncora volta ao dia 31', () => {
      expect(addMonthsClamped(d('2026-01-31'), 2)).toBe('2026-03-31');
    });

    it('atravessa a virada de ano nos dois sentidos', () => {
      expect(addMonthsClamped(d('2026-11-15'), 3)).toBe('2027-02-15');
      expect(addMonthsClamped(d('2026-02-15'), -3)).toBe('2025-11-15');
    });
  });

  describe('comparações e diferenças', () => {
    it('compara datas', () => {
      expect(compareDates(d('2026-01-05'), d('2026-01-06'))).toBeLessThan(0);
      expect(compareDates(d('2026-12-31'), d('2026-01-01'))).toBeGreaterThan(0);
      expect(compareDates(d('2026-01-05'), d('2026-01-05'))).toBe(0);
    });

    it('conta dias e meses entre datas', () => {
      expect(daysBetween(d('2026-02-01'), d('2026-03-01'))).toBe(28);
      expect(daysBetween(d('2026-03-01'), d('2026-02-01'))).toBe(-28);
      expect(monthsBetween(d('2026-01-31'), d('2026-03-01'))).toBe(2);
      expect(monthsBetween(d('2025-11-10'), d('2026-02-10'))).toBe(3);
    });
  });

  describe('todayIn', () => {
    it('usa o fuso informado, não o UTC', () => {
      // 02:00 UTC do dia 1º ainda é 23:00 do dia 31 em São Paulo (UTC-3)
      const instant = new Date('2026-01-01T02:00:00Z');
      expect(todayIn('America/Sao_Paulo', instant)).toBe('2025-12-31');
      expect(todayIn('UTC', instant)).toBe('2026-01-01');
    });
  });

  describe('conversão com o banco', () => {
    it('ida e volta sem perder um dia', () => {
      const date = d('2026-10-05');
      expect(toDbDate(date).toISOString()).toBe('2026-10-05T00:00:00.000Z');
      expect(fromDbDate(toDbDate(date))).toBe('2026-10-05');
    });
  });
});
