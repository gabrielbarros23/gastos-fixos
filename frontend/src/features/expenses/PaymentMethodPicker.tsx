import { Plus } from 'lucide-react';
import { useState } from 'react';
import styled from 'styled-components';
import { usePaymentMethods } from '../../api/payment-methods';
import type { PaymentMethod } from '../../api/types';
import { IconButton } from '../../components/ui/Button';
import { Select } from '../../components/ui/Field';
import { NO_PAYMENT_METHOD, paymentMethodLabel } from '../../lib/payment-methods';
import { PaymentMethodFormModal } from '../payment-methods/PaymentMethodFormModal';

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};

  select {
    flex: 1;
    min-width: 0;
  }
`;

/** Valor do <option> "Escolha…" (diferente de "", que é "sem forma de pagamento"). */
export const UNSET = '__unset';

/** Opções do select: "sem forma" (valor vazio) e as formas do usuário. */
export function PaymentMethodOptions({ methods }: { methods: PaymentMethod[] }) {
  return (
    <>
      <option value="">{NO_PAYMENT_METHOD}</option>
      {methods.map((method) => (
        <option key={method.id} value={method.id}>
          {paymentMethodLabel(method)}
        </option>
      ))}
    </>
  );
}

interface PaymentMethodPickerProps {
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  /** id da forma, "" = sem forma, UNSET = nada escolhido ainda */
  value: string;
  onChange: (value: string) => void;
  /** Mostra "Escolha…" como opção inicial (desabilitada). */
  requireChoice?: boolean;
}

/**
 * Select de forma de pagamento com um "+" ao lado: cria uma forma nova sem sair
 * do que o usuário está fazendo, e já deixa ela selecionada.
 */
export function PaymentMethodPicker({
  value,
  onChange,
  requireChoice = false,
  ...a11y
}: PaymentMethodPickerProps) {
  const methods = usePaymentMethods();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <Row>
        <Select {...a11y} value={value} onChange={(event) => onChange(event.target.value)}>
          {requireChoice && (
            <option value={UNSET} disabled>
              Escolha…
            </option>
          )}
          <PaymentMethodOptions methods={methods.data ?? []} />
        </Select>
        <IconButton label="Nova forma de pagamento" onClick={() => setCreating(true)}>
          <Plus size={18} />
        </IconButton>
      </Row>
      <PaymentMethodFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(method) => onChange(method.id)}
      />
    </>
  );
}
