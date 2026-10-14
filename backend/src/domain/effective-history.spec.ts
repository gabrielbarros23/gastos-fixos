import { parseCalendarDate as d } from './calendar-date.js';
import { recordAt } from './effective-history.js';

describe('recordAt', () => {
  // Histórico de forma de pagamento: null = "sem forma" a partir da data.
  const history = [
    { paymentMethodId: 'picpay', effectiveFrom: d('2026-06-10') },
    { paymentMethodId: 'nubank', effectiveFrom: d('2026-01-10') },
    { paymentMethodId: null, effectiveFrom: d('2026-09-01') },
  ];

  it('devolve o registro inteiro vigente na data', () => {
    expect(recordAt(history, d('2026-03-10'))?.paymentMethodId).toBe('nubank');
    expect(recordAt(history, d('2026-06-10'))?.paymentMethodId).toBe('picpay');
  });

  it('um registro com valor null também é uma vigência (diferente de não ter registro)', () => {
    expect(recordAt(history, d('2026-10-10'))).toEqual({
      paymentMethodId: null,
      effectiveFrom: d('2026-09-01'),
    });
    expect(recordAt(history, d('2025-12-31'))).toBeUndefined();
  });
});
