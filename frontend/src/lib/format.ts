const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/**
 * Centavos → "R$ 1.234,56". A API trabalha só com inteiros em centavos; a
 * divisão por 100 acontece apenas aqui, na hora de exibir.
 */
export function formatCents(cents: number): string {
  // O Intl usa espaço não separável depois do "R$"; normalizamos para espaço comum.
  return brl.format(cents / 100).replace(/ /g, ' ');
}

/**
 * "2026-10-05" → "05/10/2026". Faz só a troca de posições na string: nada de
 * `new Date("2026-10-05")`, que seria meia-noite UTC e viraria 04/10 no Brasil.
 */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/** "2026-10-05" → "05/10" (quando o ano é óbvio pelo contexto). */
export function formatDayMonth(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
}

const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Centavos → "R$ 3,2 mil" (rótulos de gráfico, onde falta espaço). */
export function formatCentsCompact(cents: number): string {
  return brlCompact.format(cents / 100).replace(/ /g, ' ');
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Plural simples em português: pluralize(2, 'mês', 'meses') → "2 meses". */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
