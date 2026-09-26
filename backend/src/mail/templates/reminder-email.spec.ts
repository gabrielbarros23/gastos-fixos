import { parseCalendarDate as d } from '../../domain/calendar-date.js';
import { renderReminderEmail, whenLabel } from './reminder-email.js';

const base = {
  to: 'gabriel@test.com',
  userName: 'Gabriel',
  expenseName: 'Netflix',
  categoryName: 'Streaming',
  amountCents: 5990,
  dueDate: d('2026-10-10'),
  daysUntil: 1,
  installment: null,
  calendarUrl: 'http://localhost:5173/?mes=2026-10',
};

describe('renderReminderEmail', () => {
  it.each([
    [0, 'vence hoje'],
    [1, 'vence amanhã'],
    [3, 'vence em 3 dias'],
  ])('%i dias → "%s"', (days, expected) => {
    expect(whenLabel(days)).toBe(expected);
  });

  it('assunto com nome, prazo e valor', () => {
    expect(renderReminderEmail(base).subject).toBe(
      'Netflix vence amanhã · R$ 59,90',
    );
  });

  it('corpo em português com valor, data dd/mm/aaaa e link para o calendário', () => {
    const { html, text } = renderReminderEmail(base);

    expect(html).toContain('Olá, Gabriel!');
    expect(html).toContain('R$ 59,90');
    expect(html).toContain('10/10/2026');
    expect(html).toContain('href="http://localhost:5173/?mes=2026-10"');
    expect(text).toContain('Valor previsto: R$ 59,90');
  });

  it('mostra a parcela quando o gasto é parcelado', () => {
    const { html } = renderReminderEmail({
      ...base,
      installment: { number: 3, total: 12 },
    });
    expect(html).toContain('3/12');
  });

  it('escapa o que o usuário digitou (sem HTML injetado no e-mail)', () => {
    const { html } = renderReminderEmail({
      ...base,
      expenseName: '<img src=x onerror=alert(1)>',
      userName: 'Ana & "Bia"',
    });

    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('Ana &amp; &quot;Bia&quot;');
  });
});
