import type { ComponentProps } from 'react';
import { formatCents } from '../../lib/format';
import { centsFromTyped } from '../../lib/money';
import { Input } from './Field';

type MoneyInputProps = Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> & {
  /** Valor em centavos. */
  value: number;
  onChange: (cents: number) => void;
};

/**
 * Campo de dinheiro: guarda centavos (inteiro) e mostra "R$ 59,90". O usuário
 * só digita números; eles entram pela direita, como em app de banco.
 */
export function MoneyInput({ value, onChange, ...rest }: MoneyInputProps) {
  return (
    <Input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={formatCents(value)}
      onChange={(event) => onChange(centsFromTyped(event.target.value))}
    />
  );
}
