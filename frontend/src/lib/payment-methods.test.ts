import { describe, expect, it } from 'vitest';
import { describeInvoice, describePaymentMethod } from './payment-methods';

describe('describePaymentMethod', () => {
  it('cartão de crédito mostra o ciclo da fatura', () => {
    expect(describePaymentMethod({ type: 'CREDIT_CARD', closingDay: 25, dueDay: 5 })).toBe(
      'Cartão de crédito · fecha dia 25, vence dia 5',
    );
  });

  it('as outras formas mostram só o tipo', () => {
    expect(describePaymentMethod({ type: 'PIX', closingDay: null, dueDay: null })).toBe('Pix');
    expect(describePaymentMethod({ type: 'ACCOUNT_DEBIT', closingDay: null, dueDay: null })).toBe(
      'Débito automático',
    );
  });
});

describe('describeInvoice', () => {
  it('mostra vencimento e fechamento', () => {
    expect(describeInvoice({ closingDate: '2026-10-25', dueDate: '2026-11-05' })).toBe(
      'Fatura de 05/11 (fecha 25/10)',
    );
  });
});
