import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import styled from 'styled-components';
import { errorMessage } from '../../api/errors';
import {
  useAddExpensePaymentMethod,
  useCorrectExpensePaymentMethod,
  useRemoveExpensePaymentMethod,
} from '../../api/expenses';
import { usePaymentMethods } from '../../api/payment-methods';
import type { ExpenseDetail, ExpensePaymentMethod, PaymentMethod } from '../../api/types';
import { Button, IconButton } from '../../components/ui/Button';
import { Badge, ColorDot } from '../../components/ui/Card';
import { Field, FormError, Input, Select } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';
import { todayIso } from '../../lib/dates';
import { formatDate } from '../../lib/format';
import { NO_PAYMENT_METHOD, paymentMethodLabel } from '../../lib/payment-methods';
import { PaymentMethodOptions, PaymentMethodPicker, UNSET } from './PaymentMethodPicker';

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
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space[2]};
    font-size: ${({ theme }) => theme.font.size.md};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Empty = styled.p`
  padding: ${({ theme }) => theme.space[3]};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.textMuted};
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

function HistoryRow({
  assignment,
  expense,
  methods,
  isCurrent,
}: {
  assignment: ExpensePaymentMethod;
  expense: ExpenseDetail;
  methods: PaymentMethod[];
  isCurrent: boolean;
}) {
  const toast = useToast();
  const correct = useCorrectExpensePaymentMethod();
  const remove = useRemoveExpensePaymentMethod();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(assignment.paymentMethod?.id ?? '');
  const key = { expenseId: expense.id, assignmentId: assignment.id };

  const save = () =>
    correct.mutate(
      { ...key, paymentMethodId: value || null },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success('Forma de pagamento corrigida');
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );

  return (
    <Row>
      <When>
        {editing ? (
          <Select
            aria-label="Forma de pagamento correta"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoFocus
          >
            <PaymentMethodOptions methods={methods} />
          </Select>
        ) : (
          <strong>
            {assignment.paymentMethod && <ColorDot $color={assignment.paymentMethod.color} />}
            {assignment.paymentMethod
              ? paymentMethodLabel(assignment.paymentMethod)
              : NO_PAYMENT_METHOD}
          </strong>
        )}
        {assignment.effectiveFrom === expense.startDate
          ? 'Desde o início'
          : `A partir de ${formatDate(assignment.effectiveFrom)}`}
      </When>
      {isCurrent && !editing && <Badge $tone="primary">Atual</Badge>}
      {editing ? (
        <>
          <IconButton label="Cancelar correção" onClick={() => setEditing(false)}>
            <X size={16} />
          </IconButton>
          <IconButton label="Salvar correção" onClick={save} disabled={correct.isPending}>
            <Check size={16} />
          </IconButton>
        </>
      ) : (
        <>
          <IconButton label="Corrigir (escolhi a forma errada)" onClick={() => setEditing(true)}>
            <Pencil size={16} />
          </IconButton>
          <IconButton
            label="Desfazer esta troca"
            tone="danger"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(key, {
                onSuccess: () => toast.success('Troca desfeita'),
                onError: (error) => toast.error(errorMessage(error)),
              })
            }
          >
            <Trash2 size={16} />
          </IconButton>
        </>
      )}
    </Row>
  );
}

/**
 * Histórico da forma de pagamento, no mesmo espírito do histórico de valores:
 * - trocar: nova forma a partir de uma data (os meses anteriores não mudam);
 * - corrigir: a forma estava errada naquele período (o passado muda junto).
 */
export function PaymentMethodHistory({ expense }: { expense: ExpenseDetail }) {
  const toast = useToast();
  const methods = usePaymentMethods();
  const add = useAddExpensePaymentMethod();
  const history = expense.paymentMethods;
  // Começa sem escolha: "sem forma de pagamento" também é uma opção válida, então
  // não pode ser o padrão (um clique distraído removeria a forma do gasto).
  const [paymentMethodId, setPaymentMethodId] = useState(UNSET);
  // Sem histórico, o natural é definir desde o início; com histórico, trocar a partir de hoje.
  const [effectiveFrom, setEffectiveFrom] = useState(
    history.length === 0 ? expense.startDate : todayIso(),
  );
  const [error, setError] = useState<string | null>(null);

  const today = todayIso();
  const reference = today > expense.startDate ? today : expense.startDate;
  const current = [...history].reverse().find((a) => a.effectiveFrom <= reference);
  const options = methods.data ?? [];

  return (
    <div>
      {history.length === 0 ? (
        <Empty>
          {NO_PAYMENT_METHOD}. Escolha abaixo por onde este gasto é pago para ele entrar no resumo
          da forma de pagamento.
        </Empty>
      ) : (
        <List>
          {[...history].reverse().map((assignment) => (
            <HistoryRow
              key={assignment.id}
              assignment={assignment}
              expense={expense}
              methods={options}
              isCurrent={assignment.id === current?.id}
            />
          ))}
        </List>
      )}

      <AddForm
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          add.mutate(
            { expenseId: expense.id, paymentMethodId: paymentMethodId || null, effectiveFrom },
            {
              onSuccess: () => toast.success('Forma de pagamento registrada'),
              onError: (err) => setError(errorMessage(err)),
            },
          );
        }}
      >
        <Field label={history.length === 0 ? 'Forma de pagamento' : 'Nova forma'}>
          {(a11y) => (
            <PaymentMethodPicker
              {...a11y}
              requireChoice
              value={paymentMethodId}
              onChange={setPaymentMethodId}
            />
          )}
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
          loading={add.isPending}
          disabled={paymentMethodId === UNSET}
        >
          {history.length === 0 ? 'Definir' : 'Trocar'}
        </Button>
      </AddForm>
      {error && <FormError style={{ marginTop: 12 }}>{error}</FormError>}
      <Help>
        Trocou de cartão? Registre a nova forma e a data: os meses anteriores continuam na forma
        antiga. Se escolheu a forma errada, use o lápis para corrigir.
        {methods.data?.length === 0 && (
          <>
            {' '}
            <Link to="/formas-de-pagamento">Cadastrar uma forma de pagamento</Link>
          </>
        )}
      </Help>
    </div>
  );
}
