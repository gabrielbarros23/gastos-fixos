/** Mesmo teto da API: R$ 1.000.000,00. */
export const MAX_AMOUNT_CENTS = 100_000_000;

/**
 * Campo de dinheiro no padrão dos apps de banco: o usuário só digita números
 * e eles "entram pela direita" (5 → 0,05 · 59 → 0,59 · 5990 → 59,90). Assim
 * não existe vírgula, ponto ou float no meio do caminho: vira centavos direto.
 */
export function centsFromTyped(value: string): number {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  const cents = digits === '' ? 0 : Number(digits);
  return Math.min(cents, MAX_AMOUNT_CENTS);
}
