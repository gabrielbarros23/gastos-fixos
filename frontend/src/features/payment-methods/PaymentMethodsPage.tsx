import { Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { useState } from 'react';
import styled from 'styled-components';
import { errorMessage } from '../../api/errors';
import { useDeletePaymentMethod, usePaymentMethods } from '../../api/payment-methods';
import type { PaymentMethod } from '../../api/types';
import { Button, IconButton } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { PaymentMethodIcon } from '../../components/ui/PaymentMethodIcon';
import { CenteredSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { pluralize } from '../../lib/format';
import { describePaymentMethod, paymentMethodLabel } from '../../lib/payment-methods';
import { PaymentMethodFormModal } from './PaymentMethodFormModal';

const Grid = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.space[3]};
`;

const Item = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[3]} ${({ theme }) => theme.space[4]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};

  > div {
    flex: 1;
    min-width: 0;
  }
  strong {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  span {
    display: block;
    font-size: ${({ theme }) => theme.font.size.xs};
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

type Dialog =
  | { type: 'create' }
  | { type: 'edit'; method: PaymentMethod }
  | { type: 'delete'; method: PaymentMethod }
  | null;

export function PaymentMethodsPage() {
  const toast = useToast();
  const methods = usePaymentMethods();
  const deleteMethod = useDeletePaymentMethod();
  const [dialog, setDialog] = useState<Dialog>(null);

  const close = () => {
    setDialog(null);
    deleteMethod.reset();
  };

  return (
    <>
      <PageHeader
        title="Formas de pagamento"
        subtitle="Cartões, Pix automático, débito em conta: veja quanto cada um cobra por mês."
        actions={
          <Button icon={<Plus size={18} />} onClick={() => setDialog({ type: 'create' })}>
            Nova forma
          </Button>
        }
      />

      {methods.isPending ? (
        <CenteredSpinner />
      ) : methods.isError ? (
        <ErrorState error={methods.error} onRetry={() => void methods.refetch()} />
      ) : methods.data.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhuma forma de pagamento"
          description="Cadastre seus cartões e contas e escolha em cada gasto por onde ele é pago. O resumo mostra quanto vai sair de cada um."
          action={
            <Button size="sm" onClick={() => setDialog({ type: 'create' })}>
              Cadastrar forma de pagamento
            </Button>
          }
        />
      ) : (
        <Grid>
          {methods.data.map((method) => (
            <Item key={method.id}>
              <PaymentMethodIcon method={method} />
              <div>
                <strong>{paymentMethodLabel(method)}</strong>
                <span>{describePaymentMethod(method)}</span>
                <span>{pluralize(method.expenseCount, 'gasto', 'gastos')}</span>
              </div>
              <IconButton label="Editar" onClick={() => setDialog({ type: 'edit', method })}>
                <Pencil size={16} />
              </IconButton>
              <IconButton
                label={
                  method.expenseCount > 0
                    ? 'Está no histórico de algum gasto: remova-a dos gastos antes de excluir'
                    : 'Excluir'
                }
                tone="danger"
                disabled={method.expenseCount > 0}
                onClick={() => setDialog({ type: 'delete', method })}
              >
                <Trash2 size={16} />
              </IconButton>
            </Item>
          ))}
        </Grid>
      )}

      <PaymentMethodFormModal
        open={dialog?.type === 'create' || dialog?.type === 'edit'}
        method={dialog?.type === 'edit' ? dialog.method : undefined}
        onClose={close}
      />

      <ConfirmDialog
        open={dialog?.type === 'delete'}
        title="Excluir forma de pagamento?"
        confirmLabel="Excluir"
        loading={deleteMethod.isPending}
        error={deleteMethod.error ? errorMessage(deleteMethod.error) : null}
        onClose={close}
        onConfirm={() =>
          dialog?.type === 'delete' &&
          deleteMethod.mutate(dialog.method.id, {
            onSuccess: () => {
              toast.success('Forma de pagamento excluída');
              close();
            },
          })
        }
      >
        <p>
          A forma de pagamento <strong>{dialog?.type === 'delete' && dialog.method.name}</strong>{' '}
          será excluída.
        </p>
      </ConfirmDialog>
    </>
  );
}
