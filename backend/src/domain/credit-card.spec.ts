import {
  addDays,
  parseCalendarDate as d,
  type CalendarDate,
} from './calendar-date.js';
import {
  billingOf,
  invoiceDueIn,
  invoiceForCharge,
  MAX_BILLING_DELAY_MONTHS,
  type CardCycle,
} from './credit-card.js';
import {
  addMonthsToYearMonth,
  monthOf,
  parseYearMonth as ym,
} from './year-month.js';

// Fecha dia 25, vence dia 5 do mês seguinte (o caso mais comum).
const nubank: CardCycle = { closingDay: 25, dueDay: 5 };
// Fecha dia 3, vence dia 10 do mesmo mês.
const picpay: CardCycle = { closingDay: 3, dueDay: 10 };

describe('invoiceForCharge', () => {
  it('cobrança antes do fechamento entra na fatura que fecha no mesmo mês', () => {
    expect(invoiceForCharge(d('2026-10-10'), nubank)).toEqual({
      closingDate: d('2026-10-25'),
      dueDate: d('2026-11-05'),
    });
  });

  it('cobrança NO dia do fechamento já vai para a fatura seguinte', () => {
    expect(invoiceForCharge(d('2026-10-24'), nubank).dueDate).toBe(
      '2026-11-05',
    );
    expect(invoiceForCharge(d('2026-10-25'), nubank).dueDate).toBe(
      '2026-12-05',
    );
  });

  it('vencimento depois do fechamento: a fatura vence no mesmo mês em que fecha', () => {
    expect(invoiceForCharge(d('2026-10-02'), picpay)).toEqual({
      closingDate: d('2026-10-03'),
      dueDate: d('2026-10-10'),
    });
    expect(invoiceForCharge(d('2026-10-15'), picpay)).toEqual({
      closingDate: d('2026-11-03'),
      dueDate: d('2026-11-10'),
    });
  });

  it('vira o ano: cobrança de dezembro depois do fechamento vence em fevereiro', () => {
    expect(invoiceForCharge(d('2026-12-28'), nubank)).toEqual({
      closingDate: d('2027-01-25'),
      dueDate: d('2027-02-05'),
    });
  });

  it('fechamento no dia 31 cai no último dia dos meses curtos', () => {
    const cycle: CardCycle = { closingDay: 31, dueDay: 8 };
    expect(invoiceForCharge(d('2027-02-27'), cycle)).toEqual({
      closingDate: d('2027-02-28'),
      dueDate: d('2027-03-08'),
    });
    // 28/02 já é o dia do fechamento: vai para a fatura de março
    expect(invoiceForCharge(d('2027-02-28'), cycle)).toEqual({
      closingDate: d('2027-03-31'),
      dueDate: d('2027-04-08'),
    });
    expect(invoiceForCharge(d('2028-02-28'), cycle).closingDate).toBe(
      '2028-02-29', // bissexto
    );
  });

  it('vencimento no dia 31 também é limitado ao fim do mês', () => {
    const cycle: CardCycle = { closingDay: 20, dueDay: 31 };
    expect(invoiceForCharge(d('2026-11-10'), cycle).dueDate).toBe('2026-11-30');
  });
});

describe('invoiceDueIn', () => {
  it('encontra a fatura que vence no mês', () => {
    expect(invoiceDueIn(ym('2026-11'), nubank)).toEqual({
      closingDate: d('2026-10-25'),
      dueDate: d('2026-11-05'),
    });
    expect(invoiceDueIn(ym('2026-11'), picpay)).toEqual({
      closingDate: d('2026-11-03'),
      dueDate: d('2026-11-10'),
    });
    expect(invoiceDueIn(ym('2027-01'), nubank).closingDate).toBe('2026-12-25');
  });

  it('é a inversa de invoiceForCharge para todos os dias de dois anos', () => {
    const cycles: CardCycle[] = [
      nubank,
      picpay,
      { closingDay: 31, dueDay: 8 },
      { closingDay: 1, dueDay: 1 },
      { closingDay: 30, dueDay: 31 },
    ];
    for (const cycle of cycles) {
      let date: CalendarDate = d('2026-01-01');
      while (date < '2028-01-01') {
        const invoice = invoiceForCharge(date, cycle);
        expect(invoiceDueIn(monthOf(invoice.dueDate), cycle)).toEqual(invoice);
        date = addDays(date, 1);
      }
    }
  });
});

describe('billingOf', () => {
  it('sem cartão, conta no mês da própria cobrança', () => {
    expect(billingOf(d('2026-10-28'), null)).toEqual({
      month: '2026-10',
      invoice: null,
    });
  });

  it('no cartão, conta no mês em que a fatura vence', () => {
    expect(billingOf(d('2026-10-10'), nubank)).toEqual({
      month: '2026-11',
      invoice: { closingDate: d('2026-10-25'), dueDate: d('2026-11-05') },
    });
  });

  it(`nenhuma cobrança pesa mais de ${MAX_BILLING_DELAY_MONTHS} meses depois`, () => {
    const worstCase: CardCycle = { closingDay: 1, dueDay: 1 };
    let date: CalendarDate = d('2026-01-01');
    while (date < '2027-01-01') {
      const { month } = billingOf(date, worstCase);
      const latest = addMonthsToYearMonth(
        monthOf(date),
        MAX_BILLING_DELAY_MONTHS,
      );
      expect(month <= latest).toBe(true);
      date = addDays(date, 1);
    }
  });
});
