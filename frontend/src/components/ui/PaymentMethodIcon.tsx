import { CircleHelp } from 'lucide-react';
import styled from 'styled-components';
import type { PaymentMethodRef } from '../../api/types';
import { PAYMENT_METHOD_ICON } from '../../lib/payment-methods';

const Circle = styled.i<{ $color?: string; $size: number }>`
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background: ${({ theme, $color }) => $color ?? theme.colors.surfaceMuted};
  color: ${({ theme, $color }) => ($color ? '#fff' : theme.colors.textMuted)};
`;

/** Ícone do tipo num círculo da cor da forma de pagamento (cinza = sem forma). */
export function PaymentMethodIcon({
  method,
  size = 36,
}: {
  method: Pick<PaymentMethodRef, 'type' | 'color'> | null;
  size?: number;
}) {
  const Icon = method ? PAYMENT_METHOD_ICON[method.type] : CircleHelp;
  return (
    <Circle $color={method?.color} $size={size} aria-hidden>
      <Icon size={Math.round(size / 2)} />
    </Circle>
  );
}
