import { useState } from 'react';
import styled from 'styled-components';
import { errorMessage } from '../../api/errors';
import { useMarkPaid, useUnmarkPaid } from '../../api/occurrences';
import type { Occurrence } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Badge, ColorDot } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Field';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { useToast } from '../../components/ui/Toast';
import { todayIso } from '../../lib/dates';
import { formatCents, formatDate } from '../../lib/format';
import { describeInvoice } from '../../lib/payment-methods';
import { STATUS_LABEL, STATUS_TONE } from './status';

const Item = styled.li`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[4]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:first-child {
    padding-top: 0;
  }
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

const Top = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]};
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;

  strong {
    font-weight: ${({ theme }) => theme.font.weight.semibold};
  }
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Amount = styled.div`
  text-align: right;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  white-space: nowrap;

  small {
    display: block;
    font-size: ${({ theme }) => theme.font.size.xs};
    font-weight: ${({ theme }) => theme.font.weight.regular};
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
  padding-left: 22px;
`;

const PayForm = styled.form`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[3]};
  margin-left: 22px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceMuted};

  > div:last-child {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    gap: ${({ theme }) => theme.space[2]};
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

/** Um vencimento na lista do dia, com as ações de pagamento. */
export function OccurrenceItem({ occurrence }: { occurrence: Occurrence }) {
  const toast = useToast();
  const markPaid = useMarkPaid();
  const unmarkPaid = useUnmarkPaid();
  const [editing, setEditing] = useState(false);
  const [paidAmount, setPaidAmount] = useState(occurrence.expectedAmountCents);
  const [paidAt, setPaidAt] = useState(todayIso());

  const key = { expenseId: occurrence.expenseId, dueDate: occurrence.dueDate };
  const busy = markPaid.isPending || unmarkPaid.isPending;

  const pay = (body: { paidAmountCents?: number; paidAt?: string } = {}) =>
    markPaid.mutate(
      { ...key, ...body },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success(`${occurrence.name}: pagamento registrado`);
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );

  const unpay = () =>
    unmarkPaid.mutate(key, {
      onSuccess: () => toast.success(`${occurrence.name}: pagamento desmarcado`),
      onError: (error) => toast.error(errorMessage(error)),
    });

  return (
    <Item>
      <Top>
        <ColorDot $color={occurrence.category.color} $size={12} style={{ marginTop: 6 }} />
        <Info>
          <strong>{occurrence.name}</strong>
          <Meta>
            <span>{occurrence.category.name}</span>
            {occurrence.installment && (
              <span>
                · Parcela {occurrence.installment.number}/{occurrence.installment.total}
              </span>
            )}
            <Badge $tone={STATUS_TONE[occurrence.status]}>{STATUS_LABEL[occurrence.status]}</Badge>
          </Meta>
          {occurrence.paymentMethod && (
            <Meta>
              <ColorDot $color={occurrence.paymentMethod.color} $size={8} />
              <span>{occurrence.paymentMethod.name}</span>
              {occurrence.invoice && <span>· {describeInvoice(occurrence.invoice)}</span>}
            </Meta>
          )}
        </Info>
        <Amount>
          {formatCents(occurrence.expectedAmountCents)}
          {occurrence.payment && (
            <small>
              pago {formatCents(occurrence.payment.paidAmountCents)} em{' '}
              {formatDate(occurrence.payment.paidAt)}
            </small>
          )}
        </Amount>
      </Top>

      {editing ? (
        <PayForm
          onSubmit={(event) => {
            event.preventDefault();
            pay({ paidAmountCents: paidAmount, paidAt });
          }}
        >
          <Field label="Valor pago">
            {(a11y) => <MoneyInput {...a11y} value={paidAmount} onChange={setPaidAmount} />}
          </Field>
          <Field label="Pago em">
            {(a11y) => (
              <Input
                {...a11y}
                type="date"
                value={paidAt}
                max={todayIso()}
                onChange={(event) => setPaidAt(event.target.value)}
                required
              />
            )}
          </Field>
          <div>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={markPaid.isPending} disabled={paidAmount < 1}>
              Salvar pagamento
            </Button>
          </div>
        </PayForm>
      ) : (
        <Actions>
          {occurrence.payment ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditing(true)}
                disabled={busy}
              >
                Editar pagamento
              </Button>
              <Button variant="ghost" size="sm" onClick={unpay} loading={unmarkPaid.isPending}>
                Desmarcar
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={() => pay()} loading={markPaid.isPending}>
                Marcar como pago
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} disabled={busy}>
                Outro valor ou data
              </Button>
            </>
          )}
        </Actions>
      )}
    </Item>
  );
}
