import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import styled from 'styled-components';
import { z } from 'zod';
import { applyFieldErrors, errorMessage, errorStatus } from '../../api/errors';
import {
  useDeletePaymentMethod,
  usePaymentMethods,
  useSavePaymentMethod,
} from '../../api/payment-methods';
import type { PaymentMethod, PaymentMethodType } from '../../api/types';
import { Button, IconButton } from '../../components/ui/Button';
import { ColorPicker } from '../../components/ui/ColorPicker';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FieldRow, Form, FormError, Input, Select } from '../../components/ui/Field';
import { Modal, ModalActions } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { PaymentMethodIcon } from '../../components/ui/PaymentMethodIcon';
import { CenteredSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { pluralize } from '../../lib/format';
import { PALETTE } from '../../lib/palette';
import {
  describePaymentMethod,
  PAYMENT_METHOD_TYPE_LABEL,
  PAYMENT_METHOD_TYPES,
} from '../../lib/payment-methods';

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

const Help = styled.p`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.textSubtle};
`;

const isDay = (value: string) =>
  /^\d{1,2}$/.test(value) && Number(value) >= 1 && Number(value) <= 31;

const schema = z
  .object({
    name: z.string().trim().min(1, 'Informe o nome').max(50, 'Máximo de 50 caracteres'),
    type: z.enum(PAYMENT_METHOD_TYPES as [PaymentMethodType, ...PaymentMethodType[]]),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Escolha uma cor'),
    // Texto no formulário; vira número (ou null) ao enviar.
    closingDay: z.string(),
    dueDay: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.type !== 'CREDIT_CARD') return;
    for (const field of ['closingDay', 'dueDay'] as const) {
      if (!isDay(values[field])) {
        ctx.addIssue({ code: 'custom', path: [field], message: 'Informe um dia de 1 a 31' });
      }
    }
  });
type PaymentMethodForm = z.infer<typeof schema>;

function PaymentMethodFormModal({
  method,
  open,
  onClose,
}: {
  method?: PaymentMethod;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={method ? 'Editar forma de pagamento' : 'Nova forma de pagamento'}
      width={480}
    >
      <PaymentMethodFormContent method={method} onClose={onClose} />
    </Modal>
  );
}

function PaymentMethodFormContent({
  method,
  onClose,
}: {
  method?: PaymentMethod;
  onClose: () => void;
}) {
  const toast = useToast();
  const save = useSavePaymentMethod();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PaymentMethodForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: method?.name ?? '',
      type: method?.type ?? 'CREDIT_CARD',
      color: method?.color ?? PALETTE[0],
      closingDay: method?.closingDay ? String(method.closingDay) : '',
      dueDay: method?.dueDay ? String(method.dueDay) : '',
    },
  });
  const type = useWatch({ control, name: 'type' });
  const isCard = type === 'CREDIT_CARD';

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await save.mutateAsync({
        id: method?.id,
        name: values.name,
        type: values.type,
        color: values.color,
        closingDay: isCard ? Number(values.closingDay) : null,
        dueDay: isCard ? Number(values.dueDay) : null,
      });
      toast.success(method ? 'Forma de pagamento atualizada' : 'Forma de pagamento criada');
      onClose();
    } catch (error) {
      if (errorStatus(error) === 409) {
        setError('name', { message: 'Já existe uma forma de pagamento com esse nome' });
      } else if (
        !applyFieldErrors(error, setError, ['name', 'type', 'color', 'closingDay', 'dueDay'])
      ) {
        setFormError(errorMessage(error));
      }
    }
  });

  return (
    <Form onSubmit={onSubmit} noValidate>
      {formError && <FormError>{formError}</FormError>}
      <FieldRow>
        <Field label="Nome" error={errors.name?.message}>
          {(a11y) => (
            <Input {...a11y} placeholder="Ex.: Nubank" data-autofocus {...register('name')} />
          )}
        </Field>
        <Field label="Tipo" error={errors.type?.message}>
          {(a11y) => (
            <Select {...a11y} {...register('type')}>
              {PAYMENT_METHOD_TYPES.map((value) => (
                <option key={value} value={value}>
                  {PAYMENT_METHOD_TYPE_LABEL[value]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </FieldRow>

      {isCard && (
        <>
          <FieldRow>
            <Field
              label="Fechamento da fatura"
              error={errors.closingDay?.message}
              hint="Dia do mês"
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  placeholder="Ex.: 25"
                  {...register('closingDay')}
                />
              )}
            </Field>
            <Field label="Vencimento da fatura" error={errors.dueDay?.message} hint="Dia do mês">
              {(a11y) => (
                <Input
                  {...a11y}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  placeholder="Ex.: 5"
                  {...register('dueDay')}
                />
              )}
            </Field>
          </FieldRow>
          <Help>
            Cobranças antes do fechamento entram na fatura daquele mês; no dia do fechamento ou
            depois, na fatura seguinte. O resumo conta cada cobrança no mês em que a fatura vence.
          </Help>
        </>
      )}

      <Controller
        control={control}
        name="color"
        render={({ field }) => (
          <Field label="Cor" error={errors.color?.message}>
            {({ id }) => (
              <ColorPicker
                id={id}
                label="Cor da forma de pagamento"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          </Field>
        )}
      />
      <ModalActions>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Salvar
        </Button>
      </ModalActions>
    </Form>
  );
}

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
                <strong>{method.name}</strong>
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
