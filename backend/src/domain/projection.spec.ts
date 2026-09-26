import { parseCalendarDate as d } from './calendar-date.js';
import { projectOccurrences, type ExpenseSchedule } from './projection.js';
import { endDateForInstallments } from './recurrence.js';

describe('projectOccurrences', () => {
  it('mudança de valor no meio do período: antes o valor antigo, depois o novo', () => {
    // Netflix no dia 10; aumento com vigência a partir de 15/06
    const netflix: ExpenseSchedule = {
      frequency: 'MONTHLY',
      interval: 1,
      startDate: d('2026-01-10'),
      amounts: [
        { amountCents: 4490, effectiveFrom: d('2026-01-10') },
        { amountCents: 5990, effectiveFrom: d('2026-06-15') },
      ],
    };

    const occurrences = projectOccurrences(
      netflix,
      d('2026-05-01'),
      d('2026-08-31'),
    );

    expect(occurrences.map((o) => [o.dueDate, o.expectedAmountCents])).toEqual([
      ['2026-05-10', 4490],
      ['2026-06-10', 4490], // 10/06 ainda é antes da vigência (15/06)
      ['2026-07-10', 5990],
      ['2026-08-10', 5990],
    ]);
  });

  it('numera as parcelas de um gasto parcelado', () => {
    const base = {
      frequency: 'MONTHLY' as const,
      interval: 1,
      startDate: d('2026-03-20'),
    };
    const phone: ExpenseSchedule = {
      ...base,
      installmentCount: 12,
      endDate: endDateForInstallments(base, 12),
      amounts: [{ amountCents: 25000, effectiveFrom: d('2026-03-20') }],
    };

    const occurrences = projectOccurrences(
      phone,
      d('2027-01-01'),
      d('2027-12-31'),
    );

    expect(occurrences.map((o) => [o.dueDate, o.installment])).toEqual([
      ['2027-01-20', { number: 11, total: 12 }],
      ['2027-02-20', { number: 12, total: 12 }],
    ]);
  });

  it('gasto não parcelado não tem número de parcela', () => {
    const rent: ExpenseSchedule = {
      frequency: 'MONTHLY',
      interval: 1,
      startDate: d('2026-01-05'),
      amounts: [{ amountCents: 150000, effectiveFrom: d('2026-01-05') }],
    };

    const [first] = projectOccurrences(rent, d('2026-01-01'), d('2026-01-31'));
    expect(first).toEqual({
      dueDate: '2026-01-05',
      expectedAmountCents: 150000,
      installment: null,
    });
  });

  it('respeita a desativação', () => {
    const gym: ExpenseSchedule = {
      frequency: 'MONTHLY',
      interval: 1,
      startDate: d('2026-01-15'),
      deactivatedAt: d('2026-03-01'),
      amounts: [{ amountCents: 9990, effectiveFrom: d('2026-01-15') }],
    };

    const dates = projectOccurrences(gym, d('2026-01-01'), d('2026-12-31')).map(
      (o) => o.dueDate,
    );
    expect(dates).toEqual(['2026-01-15', '2026-02-15']);
  });

  it('falha alto se o histórico não cobrir a data (dado inconsistente = bug)', () => {
    const broken: ExpenseSchedule = {
      frequency: 'MONTHLY',
      interval: 1,
      startDate: d('2026-01-05'),
      amounts: [{ amountCents: 1000, effectiveFrom: d('2026-03-05') }],
    };

    expect(() =>
      projectOccurrences(broken, d('2026-01-01'), d('2026-01-31')),
    ).toThrow(/sem valor vigente/);
  });
});
