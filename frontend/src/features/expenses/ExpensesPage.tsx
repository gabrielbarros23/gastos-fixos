import { Pencil, Plus, Power, PowerOff, ReceiptText, Trash2 } from 'lucide-react';
import { useState } from 'react';
import styled from 'styled-components';
import { useCategories } from '../../api/categories';
import { errorMessage } from '../../api/errors';
import {
  useDeleteExpense,
  useExpenses,
  useSetExpenseActive,
  type ExpenseStatusFilter,
} from '../../api/expenses';
import type { Expense } from '../../api/types';
import { Button, IconButton } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Select } from '../../components/ui/Field';
import { PageHeader } from '../../components/ui/PageHeader';
import { Segmented } from '../../components/ui/Segmented';
import { CenteredSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { formatCents, formatDate } from '../../lib/format';
import { paymentMethodLabel } from '../../lib/payment-methods';
import { describeRecurrence } from '../../lib/recurrence-label';
import { ExpenseFormModal } from './ExpenseFormModal';

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[4]};

  select {
    width: auto;
    min-width: 180px;
    min-height: 38px;
  }
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
`;

const Row = styled.li<{ $color: string; $inactive: boolean }>`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: ${({ theme }) => theme.space[2]} ${({ theme }) => theme.space[4]};
  align-items: center;
  padding: ${({ theme }) => theme.space[3]} ${({ theme }) => theme.space[4]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 4px solid ${({ $color }) => $color};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  opacity: ${({ $inactive }) => ($inactive ? 0.7 : 1)};

  @media (min-width: 760px) {
    grid-template-columns: 1fr auto auto;
  }
`;

const Main = styled.div`
  min-width: 0;

  h3 {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space[2]};
    font-size: ${({ theme }) => theme.font.size.md};
    font-weight: ${({ theme }) => theme.font.weight.semibold};
  }

  p {
    font-size: ${({ theme }) => theme.font.size.sm};
    color: ${({ theme }) => theme.colors.textMuted};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Money = styled.div`
  text-align: right;

  strong {
    display: block;
    font-size: ${({ theme }) => theme.font.size.md};
  }
  span {
    font-size: ${({ theme }) => theme.font.size.xs};
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const Actions = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 2px;
  margin: -${({ theme }) => theme.space[1]} -${({ theme }) => theme.space[2]} -${({ theme }) => theme.space[1]}
    0;

  @media (min-width: 760px) {
    grid-column: auto;
    margin: 0;
  }
`;

type Dialog =
  | { type: 'create' }
  | { type: 'edit'; expense: Expense }
  | { type: 'deactivate'; expense: Expense }
  | { type: 'delete'; expense: Expense }
  | null;

function endLabel(expense: Expense): string | null {
  if (expense.installmentCount)
    return `${expense.installmentCount}x até ${formatDate(expense.endDate!)}`;
  if (expense.endDate) return `até ${formatDate(expense.endDate)}`;
  return null;
}

export function ExpensesPage() {
  const toast = useToast();
  const [status, setStatus] = useState<ExpenseStatusFilter>('all');
  const [categoryId, setCategoryId] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);

  const categories = useCategories();
  const expenses = useExpenses({ status, categoryId: categoryId || undefined });
  const setActive = useSetExpenseActive();
  const deleteExpense = useDeleteExpense();

  const close = () => {
    setDialog(null);
    setActive.reset();
    deleteExpense.reset();
  };

  const filtered = status !== 'all' || categoryId !== '';

  return (
    <>
      <PageHeader
        title="Gastos fixos"
        subtitle="Tudo que se repete: assinaturas, contas, parcelas."
        actions={
          <Button icon={<Plus size={18} />} onClick={() => setDialog({ type: 'create' })}>
            Novo gasto
          </Button>
        }
      />

      <Filters>
        <Segmented<ExpenseStatusFilter>
          label="Situação"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'active', label: 'Ativos' },
            { value: 'inactive', label: 'Desativados' },
          ]}
        />
        <Select
          aria-label="Filtrar por categoria"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categories.data?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </Filters>

      {expenses.isPending ? (
        <CenteredSpinner />
      ) : expenses.isError ? (
        <ErrorState error={expenses.error} onRetry={() => void expenses.refetch()} />
      ) : expenses.data.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={filtered ? 'Nenhum gasto com esses filtros' : 'Nenhum gasto cadastrado'}
          description={
            filtered
              ? 'Tente outra situação ou categoria.'
              : 'Cadastre aluguel, assinaturas, academia, parcelas… e acompanhe tudo no calendário.'
          }
          action={
            !filtered && (
              <Button icon={<Plus size={18} />} onClick={() => setDialog({ type: 'create' })}>
                Cadastrar o primeiro
              </Button>
            )
          }
        />
      ) : (
        <List>
          {expenses.data.map((expense) => {
            const end = endLabel(expense);
            return (
              <Row key={expense.id} $color={expense.category.color} $inactive={!expense.isActive}>
                <Main>
                  <h3>
                    {expense.name}
                    {!expense.isActive && <Badge>Desativado</Badge>}
                  </h3>
                  <p>
                    {expense.category.name} · {describeRecurrence(expense)}
                    {end && ` · ${end}`}
                    {expense.paymentMethod && ` · ${paymentMethodLabel(expense.paymentMethod)}`}
                  </p>
                </Main>
                <Money>
                  <strong>{formatCents(expense.currentAmountCents)}</strong>
                  <span>
                    {expense.nextDueDate
                      ? `Próximo: ${formatDate(expense.nextDueDate)}`
                      : expense.isActive
                        ? 'Encerrado'
                        : `Desde ${formatDate(expense.deactivatedAt!)}`}
                  </span>
                </Money>
                <Actions>
                  <IconButton label="Editar" onClick={() => setDialog({ type: 'edit', expense })}>
                    <Pencil size={17} />
                  </IconButton>
                  {expense.isActive ? (
                    <IconButton
                      label="Desativar (cancelar a partir de hoje)"
                      onClick={() => setDialog({ type: 'deactivate', expense })}
                    >
                      <PowerOff size={17} />
                    </IconButton>
                  ) : (
                    <IconButton
                      label="Reativar"
                      disabled={setActive.isPending}
                      onClick={() =>
                        setActive.mutate(
                          { id: expense.id, active: true },
                          {
                            onSuccess: () => toast.success(`${expense.name} reativado`),
                            onError: (error) => toast.error(errorMessage(error)),
                          },
                        )
                      }
                    >
                      <Power size={17} />
                    </IconButton>
                  )}
                  <IconButton
                    label="Excluir"
                    tone="danger"
                    onClick={() => setDialog({ type: 'delete', expense })}
                  >
                    <Trash2 size={17} />
                  </IconButton>
                </Actions>
              </Row>
            );
          })}
        </List>
      )}

      <ExpenseFormModal
        open={dialog?.type === 'create' || dialog?.type === 'edit'}
        expense={dialog?.type === 'edit' ? dialog.expense : undefined}
        onClose={close}
      />

      <ConfirmDialog
        open={dialog?.type === 'deactivate'}
        title="Desativar gasto?"
        confirmLabel="Desativar"
        tone="primary"
        loading={setActive.isPending}
        error={setActive.error ? errorMessage(setActive.error) : null}
        onClose={close}
        onConfirm={() =>
          dialog?.type === 'deactivate' &&
          setActive.mutate(
            { id: dialog.expense.id, active: false },
            {
              onSuccess: () => {
                toast.success(`${dialog.expense.name} desativado`);
                close();
              },
            },
          )
        }
      >
        <p>
          <strong>{dialog?.type === 'deactivate' && dialog.expense.name}</strong> deixa de aparecer
          a partir de hoje. Os vencimentos anteriores continuam no calendário e no resumo.
        </p>
        <p>Você pode reativar quando quiser.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog?.type === 'delete'}
        title="Excluir gasto?"
        confirmLabel="Excluir definitivamente"
        loading={deleteExpense.isPending}
        error={deleteExpense.error ? errorMessage(deleteExpense.error) : null}
        onClose={close}
        onConfirm={() =>
          dialog?.type === 'delete' &&
          deleteExpense.mutate(dialog.expense.id, {
            onSuccess: () => {
              toast.success(`${dialog.expense.name} excluído`);
              close();
            },
          })
        }
      >
        <p>
          Isso apaga <strong>{dialog?.type === 'delete' && dialog.expense.name}</strong> e todo o
          histórico: valores e pagamentos registrados, inclusive dos meses passados.
        </p>
        <p>Se você só parou de pagar, prefira desativar.</p>
      </ConfirmDialog>
    </>
  );
}
