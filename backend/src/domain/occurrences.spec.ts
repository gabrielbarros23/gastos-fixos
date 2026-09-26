import { parseCalendarDate as d } from './calendar-date.js';
import {
  groupBy,
  occurrenceStatus,
  occurrencesWithPayments,
  totalsOf,
  type PaymentRecord,
} from './occurrences.js';
import type { ExpenseSchedule } from './projection.js';

const netflix: ExpenseSchedule = {
  frequency: 'MONTHLY',
  interval: 1,
  startDate: d('2026-01-10'),
  amounts: [
    { amountCents: 4490, effectiveFrom: d('2026-01-10') },
    { amountCents: 5990, effectiveFrom: d('2026-06-15') },
  ],
};

function payment(
  dueDate: string,
  paidAmountCents: number,
  paidAt = dueDate,
): PaymentRecord {
  return { dueDate: d(dueDate), paidAmountCents, paidAt: d(paidAt) };
}

describe('occurrencesWithPayments', () => {
  it('anexa o pagamento à ocorrência do mesmo vencimento; as outras ficam em aberto', () => {
    const result = occurrencesWithPayments(
      netflix,
      [payment('2026-02-10', 4490, '2026-02-08')],
      d('2026-02-01'),
      d('2026-03-31'),
    );

    expect(result).toEqual([
      {
        dueDate: '2026-02-10',
        expectedAmountCents: 4490,
        installment: null,
        payment: {
          dueDate: '2026-02-10',
          paidAmountCents: 4490,
          paidAt: '2026-02-08',
        },
      },
      {
        dueDate: '2026-03-10',
        expectedAmountCents: 4490,
        installment: null,
        payment: null,
      },
    ]);
  });

  it('valor pago diferente do previsto não altera o previsto', () => {
    const [occurrence] = occurrencesWithPayments(
      netflix,
      [payment('2026-07-10', 6200)], // pagou com juros
      d('2026-07-01'),
      d('2026-07-31'),
    );

    expect(occurrence.expectedAmountCents).toBe(5990);
    expect(occurrence.payment?.paidAmountCents).toBe(6200);
  });

  it('pagamento que não bate mais com a regra continua aparecendo (a regra mudou depois)', () => {
    // O vencimento era dia 10 e foi pago; depois o usuário mudou para o dia 15.
    const movedToDay15: ExpenseSchedule = {
      ...netflix,
      startDate: d('2026-01-15'),
      amounts: [{ amountCents: 4490, effectiveFrom: d('2026-01-15') }],
    };

    const result = occurrencesWithPayments(
      movedToDay15,
      [payment('2026-03-10', 4490)],
      d('2026-03-01'),
      d('2026-03-31'),
    );

    expect(
      result.map((o) => [o.dueDate, o.payment?.paidAmountCents ?? null]),
    ).toEqual([
      ['2026-03-10', 4490], // o fato registrado
      ['2026-03-15', null], // o vencimento pela regra atual
    ]);
  });

  it('pagamento antecipado de um gasto desativado depois continua aparecendo', () => {
    const cancelled: ExpenseSchedule = {
      ...netflix,
      deactivatedAt: d('2026-04-01'),
    };

    const result = occurrencesWithPayments(
      cancelled,
      [payment('2026-04-10', 4490, '2026-03-20')],
      d('2026-04-01'),
      d('2026-04-30'),
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      dueDate: '2026-04-10',
      expectedAmountCents: 4490,
    });
  });

  it('ignora pagamentos fora do período', () => {
    const result = occurrencesWithPayments(
      netflix,
      [payment('2026-01-10', 4490), payment('2026-05-10', 4490)],
      d('2026-03-01'),
      d('2026-03-31'),
    );

    expect(result).toEqual([
      {
        dueDate: '2026-03-10',
        expectedAmountCents: 4490,
        installment: null,
        payment: null,
      },
    ]);
  });
});

describe('occurrenceStatus', () => {
  const today = d('2026-03-15');

  it.each([
    ['2026-03-10', true, 'PAID'],
    ['2026-03-20', true, 'PAID'], // pago adiantado
    ['2026-03-10', false, 'OVERDUE'],
    ['2026-03-15', false, 'PENDING'], // vence hoje: ainda não está atrasado
    ['2026-03-20', false, 'PENDING'],
  ] as const)('vencimento %s, pago=%s → %s', (dueDate, paid, expected) => {
    const status = occurrenceStatus(
      { dueDate: d(dueDate), payment: paid ? payment(dueDate, 100) : null },
      today,
    );
    expect(status).toBe(expected);
  });
});

describe('totalsOf', () => {
  it('soma previsto, pago, pendente e atrasado', () => {
    const today = d('2026-03-15');
    const totals = totalsOf(
      [
        {
          dueDate: d('2026-03-05'),
          expectedAmountCents: 150000,
          payment: payment('2026-03-05', 150000),
        },
        {
          dueDate: d('2026-03-10'),
          expectedAmountCents: 5990,
          payment: payment('2026-03-10', 6200),
        },
        { dueDate: d('2026-03-12'), expectedAmountCents: 9990, payment: null }, // atrasada
        { dueDate: d('2026-03-31'), expectedAmountCents: 48000, payment: null }, // a vencer
      ],
      today,
    );

    expect(totals).toEqual({
      expectedCents: 150000 + 5990 + 9990 + 48000,
      paidCents: 150000 + 6200, // o valor realmente pago
      pendingCents: 9990 + 48000,
      overdueCents: 9990,
      occurrenceCount: 4,
      paidCount: 2,
    });
  });

  it('lista vazia dá zero em tudo', () => {
    expect(totalsOf([], d('2026-03-15'))).toEqual({
      expectedCents: 0,
      paidCents: 0,
      pendingCents: 0,
      overdueCents: 0,
      occurrenceCount: 0,
      paidCount: 0,
    });
  });
});

describe('groupBy', () => {
  it('agrupa preservando a ordem de primeira aparição', () => {
    const groups = groupBy(
      ['2026-03-10', '2026-03-05', '2026-03-10'],
      (x) => x,
    );
    expect([...groups.entries()]).toEqual([
      ['2026-03-10', ['2026-03-10', '2026-03-10']],
      ['2026-03-05', ['2026-03-05']],
    ]);
  });
});
