import { amountAt, type AmountRecord } from './amount-history.js';
import { parseCalendarDate as d } from './calendar-date.js';

describe('amountAt', () => {
  // Fora de ordem de propósito: a função não pode depender da ordenação.
  const history: AmountRecord[] = [
    { amountCents: 5990, effectiveFrom: d('2026-06-15') },
    { amountCents: 4490, effectiveFrom: d('2026-01-10') },
    { amountCents: 6490, effectiveFrom: d('2027-01-01') },
  ];

  it('usa o valor inicial antes de qualquer mudança', () => {
    expect(amountAt(history, d('2026-03-10'))).toBe(4490);
  });

  it('a mudança já vale no próprio dia da vigência', () => {
    expect(amountAt(history, d('2026-06-15'))).toBe(5990);
    expect(amountAt(history, d('2026-06-14'))).toBe(4490);
  });

  it('usa a mudança mais recente que já está vigente', () => {
    expect(amountAt(history, d('2026-12-31'))).toBe(5990);
    expect(amountAt(history, d('2027-03-01'))).toBe(6490);
  });

  it('antes de todo o histórico não há valor', () => {
    expect(amountAt(history, d('2025-12-31'))).toBeUndefined();
    expect(amountAt([], d('2026-01-01'))).toBeUndefined();
  });
});
