import type { CalendarDate } from '../domain/calendar-date.js';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** Centavos → "R$ 1.234,56" (a divisão por 100 só acontece na exibição). */
export function formatCents(cents: number): string {
  return brl.format(cents / 100).replace(/ /g, ' ');
}

/** "2026-10-05" → "05/10/2026", sem passar por Date (sem risco de fuso). */
export function formatCalendarDate(date: CalendarDate): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapa texto para HTML. Obrigatório para tudo que o usuário digitou (nome do
 * gasto, da categoria...) antes de ir para um e-mail: sem isso, um gasto
 * chamado `<img src=x onerror=...>` viraria HTML de verdade.
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}
