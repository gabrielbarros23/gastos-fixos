import { parseCalendarDate as d, type CalendarDate } from './calendar-date.js';
import {
  endDateForInstallments,
  isOccurrenceDate,
  nextOccurrence,
  occurrencesBetween,
  type RecurrenceRule,
} from './recurrence.js';

function rule(
  overrides: Partial<
    Omit<RecurrenceRule, 'startDate' | 'endDate' | 'deactivatedAt'>
  > & {
    startDate: string;
    endDate?: string;
    deactivatedAt?: string;
  },
): RecurrenceRule {
  return {
    frequency: 'MONTHLY',
    interval: 1,
    ...overrides,
    startDate: d(overrides.startDate),
    endDate: overrides.endDate ? d(overrides.endDate) : null,
    deactivatedAt: overrides.deactivatedAt ? d(overrides.deactivatedAt) : null,
  };
}

/** Só as datas das ocorrências no período. */
function datesBetween(
  r: RecurrenceRule,
  from: string,
  to: string,
): CalendarDate[] {
  return occurrencesBetween(r, d(from), d(to)).map((o) => o.date);
}

describe('recorrência', () => {
  describe('mensal no fim do mês', () => {
    it('dia 31 cai no último dia dos meses menores e volta ao 31', () => {
      const r = rule({ startDate: '2026-01-31' });
      expect(datesBetween(r, '2026-01-01', '2026-06-30')).toEqual([
        '2026-01-31',
        '2026-02-28',
        '2026-03-31',
        '2026-04-30',
        '2026-05-31',
        '2026-06-30',
      ]);
    });

    it('dia 31 em fevereiro de ano bissexto cai no dia 29', () => {
      const r = rule({ startDate: '2027-12-31' });
      expect(datesBetween(r, '2028-02-01', '2028-03-31')).toEqual([
        '2028-02-29',
        '2028-03-31',
      ]);
    });

    it('dia 30 cai em 28/02 e volta ao 30 em março', () => {
      const r = rule({ startDate: '2026-01-30' });
      expect(datesBetween(r, '2026-02-01', '2026-03-31')).toEqual([
        '2026-02-28',
        '2026-03-30',
      ]);
    });

    it('dia 29 só "encolhe" em fevereiro de ano não bissexto', () => {
      const r = rule({ startDate: '2026-01-29' });
      expect(datesBetween(r, '2026-02-01', '2026-03-31')).toEqual([
        '2026-02-28',
        '2026-03-29',
      ]);
    });
  });

  describe('anual', () => {
    it('29/02 cai em 28/02 nos anos não bissextos e volta ao 29 no bissexto', () => {
      const r = rule({ frequency: 'YEARLY', startDate: '2024-02-29' });
      expect(datesBetween(r, '2024-01-01', '2028-12-31')).toEqual([
        '2024-02-29',
        '2025-02-28',
        '2026-02-28',
        '2027-02-28',
        '2028-02-29',
      ]);
    });

    it('a cada 2 anos', () => {
      const r = rule({
        frequency: 'YEARLY',
        interval: 2,
        startDate: '2026-03-10',
      });
      expect(datesBetween(r, '2026-01-01', '2031-12-31')).toEqual([
        '2026-03-10',
        '2028-03-10',
        '2030-03-10',
      ]);
    });
  });

  describe('semanal', () => {
    it('toda semana, atravessando a virada do mês', () => {
      const r = rule({ frequency: 'WEEKLY', startDate: '2026-01-19' });
      expect(datesBetween(r, '2026-01-19', '2026-02-10')).toEqual([
        '2026-01-19',
        '2026-01-26',
        '2026-02-02',
        '2026-02-09',
      ]);
    });

    it('quinzenal (a cada 2 semanas)', () => {
      const r = rule({
        frequency: 'WEEKLY',
        interval: 2,
        startDate: '2026-01-05',
      });
      expect(datesBetween(r, '2026-01-01', '2026-02-28')).toEqual([
        '2026-01-05',
        '2026-01-19',
        '2026-02-02',
        '2026-02-16',
      ]);
    });
  });

  describe('a cada N meses', () => {
    it('trimestral', () => {
      const r = rule({ interval: 3, startDate: '2026-01-15' });
      expect(datesBetween(r, '2026-01-01', '2026-12-31')).toEqual([
        '2026-01-15',
        '2026-04-15',
        '2026-07-15',
        '2026-10-15',
      ]);
    });

    it('semestral, a partir do dia 31', () => {
      const r = rule({ interval: 6, startDate: '2026-03-31' });
      expect(datesBetween(r, '2026-01-01', '2027-12-31')).toEqual([
        '2026-03-31',
        '2026-09-30',
        '2027-03-31',
        '2027-09-30',
      ]);
    });
  });

  describe('virada de ano', () => {
    it('mensal atravessando dezembro → janeiro', () => {
      const r = rule({ startDate: '2026-10-10' });
      expect(datesBetween(r, '2026-11-01', '2027-02-28')).toEqual([
        '2026-11-10',
        '2026-12-10',
        '2027-01-10',
        '2027-02-10',
      ]);
    });
  });

  describe('período de consulta', () => {
    it('começando no meio da série, devolve o índice correto', () => {
      const r = rule({ startDate: '2025-01-31' });
      expect(occurrencesBetween(r, d('2026-02-01'), d('2026-03-31'))).toEqual([
        { index: 13, date: '2026-02-28' },
        { index: 14, date: '2026-03-31' },
      ]);
    });

    it('inclui ocorrências exatamente nas bordas (from e to inclusivos)', () => {
      const r = rule({ startDate: '2026-01-10' });
      expect(datesBetween(r, '2026-02-10', '2026-03-10')).toEqual([
        '2026-02-10',
        '2026-03-10',
      ]);
    });

    it('período antes do início da série não tem ocorrências', () => {
      const r = rule({ startDate: '2026-06-10' });
      expect(datesBetween(r, '2026-01-01', '2026-05-31')).toEqual([]);
    });

    it('período muito à frente é calculado direto, sem percorrer a série', () => {
      // 05/01/2026 é segunda-feira. De 05/01/2026 a 05/01/2126 são 36.524 dias
      // (100 × 365 + 24 bissextos, pois 2100 não é bissexto); 36.524 mod 7 = 5,
      // então 05/01/2126 é sábado e as segundas seguintes são 07/01 e 14/01.
      const r = rule({ frequency: 'WEEKLY', startDate: '2026-01-05' });
      expect(datesBetween(r, '2126-01-01', '2126-01-14')).toEqual([
        '2126-01-07',
        '2126-01-14',
      ]);
    });
  });

  describe('data de fim e parcelamento', () => {
    it('data de fim é inclusiva', () => {
      const r = rule({ startDate: '2026-01-10', endDate: '2026-03-10' });
      expect(datesBetween(r, '2026-01-01', '2026-12-31')).toEqual([
        '2026-01-10',
        '2026-02-10',
        '2026-03-10',
      ]);
    });

    it('12 parcelas mensais terminam 11 meses depois do início', () => {
      const r = rule({ startDate: '2026-01-31' });
      expect(endDateForInstallments(r, 12)).toBe('2026-12-31');
      expect(endDateForInstallments(r, 2)).toBe('2026-02-28');
      expect(endDateForInstallments(r, 1)).toBe('2026-01-31');
    });

    it('com a endDate das parcelas, a série tem exatamente N ocorrências numeradas', () => {
      const base = rule({ startDate: '2026-03-05' });
      const r = { ...base, endDate: endDateForInstallments(base, 12) };
      const occurrences = occurrencesBetween(
        r,
        d('2026-01-01'),
        d('2027-12-31'),
      );

      expect(occurrences).toHaveLength(12);
      expect(occurrences[0]).toEqual({ index: 0, date: '2026-03-05' });
      expect(occurrences[11]).toEqual({ index: 11, date: '2027-02-05' });
    });

    it('rejeita número de parcelas inválido', () => {
      const r = rule({ startDate: '2026-01-10' });
      expect(() => endDateForInstallments(r, 0)).toThrow(RangeError);
      expect(() => endDateForInstallments(r, 1.5)).toThrow(RangeError);
    });
  });

  describe('desativação', () => {
    it('corta as ocorrências a partir da data de desativação (exclusiva)', () => {
      const r = rule({ startDate: '2026-01-10', deactivatedAt: '2026-04-10' });
      expect(datesBetween(r, '2026-01-01', '2026-12-31')).toEqual([
        '2026-01-10',
        '2026-02-10',
        '2026-03-10',
      ]);
    });

    it('vale a data que vier primeiro entre fim e desativação', () => {
      const r = rule({
        startDate: '2026-01-10',
        endDate: '2026-02-10',
        deactivatedAt: '2026-06-01',
      });
      expect(datesBetween(r, '2026-01-01', '2026-12-31')).toEqual([
        '2026-01-10',
        '2026-02-10',
      ]);
    });
  });

  describe('nextOccurrence', () => {
    const r = rule({ startDate: '2026-01-31', endDate: '2026-05-31' });

    it('devolve a própria data quando ela é um vencimento', () => {
      expect(nextOccurrence(r, d('2026-02-28'))).toEqual({
        index: 1,
        date: '2026-02-28',
      });
    });

    it('devolve o próximo vencimento', () => {
      expect(nextOccurrence(r, d('2026-03-01'))?.date).toBe('2026-03-31');
    });

    it('antes do início devolve o primeiro vencimento', () => {
      expect(nextOccurrence(r, d('2025-06-01'))?.date).toBe('2026-01-31');
    });

    it('devolve null depois do fim da série', () => {
      expect(nextOccurrence(r, d('2026-06-01'))).toBeNull();
    });

    it('devolve null depois da desativação', () => {
      const inactive = rule({
        startDate: '2026-01-10',
        deactivatedAt: '2026-03-01',
      });
      expect(nextOccurrence(inactive, d('2026-02-11'))).toBeNull();
    });
  });

  describe('isOccurrenceDate', () => {
    const r = rule({ startDate: '2026-01-31' });

    it.each([
      ['2026-01-31', true],
      ['2026-02-28', true],
      ['2026-03-31', true],
      ['2026-03-30', false],
      ['2026-02-27', false],
      ['2025-12-31', false], // antes do início
    ])('%s → %s', (date, expected) => {
      expect(isOccurrenceDate(r, d(date))).toBe(expected);
    });
  });
});
