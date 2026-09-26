import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import styled from 'styled-components';
import { errorMessage } from '../../api/errors';
import { useAddAmount, useCorrectAmount, useRemoveAmount } from '../../api/expenses';
import type { Amount, ExpenseDetail } from '../../api/types';
import { Button, IconButton } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Card';
import { Field, FormError, Input } from '../../components/ui/Field';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { useToast } from '../../components/ui/Toast';
import { todayIso } from '../../lib/dates';
import { formatCents, formatDate } from '../../lib/format';

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
`;

const Row = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  min-height: 52px;
  padding: ${({ theme }) => theme.space[2]} ${({ theme }) => theme.space[3]};

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const When = styled.div`
  flex: 1;
  min-width: 0;
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.textMuted};

  strong {
    display: block;
    font-size: ${({ theme }) => theme.font.size.md};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const InlineInput = styled.div`
  width: 150px;
`;

const AddForm = styled.form`
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  align-items: end;
  gap: ${({ theme }) => theme.space[3]};
  margin-top: ${({ theme }) => theme.space[4]};

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const Help = styled.p`
  margin-top: ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.textSubtle};
`;

function AmountRow({
  amount,
  expenseId,
  isInitial,
  isCurrent,
}: {
  amount: Amount;
  expenseId: string;
  isInitial: boolean;
  isCurrent: boolean;
}) {
  const toast = useToast();
  const correct = useCorrectAmount();
  const remove = useRemoveAmount();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(amount.amountCents);

  const save = () =>
    correct.mutate(
      { expenseId, amountId: amount.id, amountCents: value },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success('Valor corrigido');
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );

  return (
    <Row>
      <When>
        {editing ? (
          <InlineInput>
            <MoneyInput value={value} onChange={setValue} aria-label="Valor corrigido" autoFocus />
          </InlineInput>
        ) : (
          <strong>{formatCents(amount.amountCents)}</strong>
        )}
        {isInitial ? 'Valor inicial' : `A partir de ${formatDate(amount.effectiveFrom)}`}
      </When>
      {isCurrent && !editing && <Badge $tone="primary">Atual</Badge>}
      {editing ? (
        <>
          <IconButton label="Cancelar correção" onClick={() => setEditing(false)}>
            <X size={16} />
          </IconButton>
          <IconButton
            label="Salvar correção"
            onClick={save}
            disabled={correct.isPending || value < 1}
          >
            <Check size={16} />
          </IconButton>
        </>
      ) : (
        <>
          <IconButton label="Corrigir valor digitado errado" onClick={() => setEditing(true)}>
            <Pencil size={16} />
          </IconButton>
          {!isInitial && (
            <IconButton
              label="Remover mudança de preço"
              tone="danger"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(
                  { expenseId, amountId: amount.id },
                  {
                    onSuccess: () => toast.success('Mudança de preço removida'),
                    onError: (error) => toast.error(errorMessage(error)),
                  },
                )
              }
            >
              <Trash2 size={16} />
            </IconButton>
          )}
        </>
      )}
    </Row>
  );
}

/**
 * Histórico de valores do gasto. Duas operações diferentes, de propósito:
 * - mudança de preço: novo valor a partir de uma data (o passado não muda);
 * - correção: o valor estava errado desde o início (o passado muda junto).
 */
export function AmountHistory({ expense }: { expense: ExpenseDetail }) {
  const toast = useToast();
  const addAmount = useAddAmount();
  const [amountCents, setAmountCents] = useState(expense.currentAmountCents);
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);

  const today = todayIso();
  // Valor vigente hoje: o de maior vigência que já começou.
  const current = [...expense.amounts].reverse().find((a) => a.effectiveFrom <= today);

  return (
    <div>
      <List>
        {[...expense.amounts].reverse().map((amount) => (
          <AmountRow
            key={amount.id}
            amount={amount}
            expenseId={expense.id}
            isInitial={amount.id === expense.amounts[0].id}
            isCurrent={amount.id === (current ?? expense.amounts[0]).id}
          />
        ))}
      </List>

      <AddForm
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          addAmount.mutate(
            { expenseId: expense.id, amountCents, effectiveFrom },
            {
              onSuccess: () => toast.success('Novo preço registrado'),
              onError: (err) => setError(errorMessage(err)),
            },
          );
        }}
      >
        <Field label="Novo preço">
          {(a11y) => <MoneyInput {...a11y} value={amountCents} onChange={setAmountCents} />}
        </Field>
        <Field label="Vale a partir de">
          {(a11y) => (
            <Input
              {...a11y}
              type="date"
              value={effectiveFrom}
              min={expense.startDate}
              onChange={(event) => setEffectiveFrom(event.target.value)}
              required
            />
          )}
        </Field>
        <Button
          type="submit"
          variant="secondary"
          loading={addAmount.isPending}
          disabled={amountCents < 1}
        >
          Registrar
        </Button>
      </AddForm>
      {error && <FormError style={{ marginTop: 12 }}>{error}</FormError>}
      <Help>
        Mudou de preço? Registre o novo valor e a data: os vencimentos anteriores continuam com o
        valor antigo. Se o valor foi digitado errado, use o lápis para corrigir.
      </Help>
    </div>
  );
}
