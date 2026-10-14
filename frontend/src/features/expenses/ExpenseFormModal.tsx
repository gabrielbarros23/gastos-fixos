import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import styled from 'styled-components';
import { z } from 'zod';
import { useCategories } from '../../api/categories';
import { applyFieldErrors, errorMessage } from '../../api/errors';
import {
  useCreateExpense,
  useExpense,
  useUpdateExpense,
  type ExpenseRuleInput,
} from '../../api/expenses';
import type { Expense, ExpenseDetail, Frequency } from '../../api/types';
import { Button } from '../../components/ui/Button';
import {
  Field,
  FieldRow,
  Form,
  FormError,
  Input,
  Select,
  Textarea,
} from '../../components/ui/Field';
import { Modal, ModalActions } from '../../components/ui/Modal';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Segmented } from '../../components/ui/Segmented';
import { CenteredSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { todayIso } from '../../lib/dates';
import { MAX_AMOUNT_CENTS } from '../../lib/money';
import { FREQUENCY_UNIT } from '../../lib/recurrence-label';
import { usePaymentMethods } from '../../api/payment-methods';
import { AmountHistory } from './AmountHistory';
import { PaymentMethodHistory, PaymentMethodOptions } from './PaymentMethodHistory';

/** Conteúdo que depende do detalhe do gasto: carregando, erro ou pronto. */
function detailContent(
  detail: ReturnType<typeof useExpense>,
  render: (expense: ExpenseDetail) => ReactNode,
) {
  if (detail.data) return render(detail.data);
  if (detail.isError) return <FormError>{errorMessage(detail.error)}</FormError>;
  return <CenteredSpinner />;
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida');

const schema = z
  .object({
    name: z.string().trim().min(1, 'Informe o nome').max(100, 'Máximo de 100 caracteres'),
    description: z.string().trim().max(500, 'Máximo de 500 caracteres'),
    categoryId: z.string().min(1, 'Escolha uma categoria'),
    // Vazio = sem forma de pagamento. Só é usado na criação.
    paymentMethodId: z.string(),
    amountCents: z
      .number()
      .int()
      .min(1, 'Informe o valor')
      .max(MAX_AMOUNT_CENTS, 'O valor excede o limite de R$ 1.000.000,00'),
    frequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
    interval: z
      .number({ error: 'Informe um número' })
      .int('Use um número inteiro')
      .min(1, 'Mínimo 1')
      .max(24, 'Máximo 24'),
    startDate: isoDate,
    endMode: z.enum(['none', 'date', 'installments']),
    endDate: z.string(),
    installments: z.number({ error: 'Informe um número' }),
  })
  .superRefine((values, ctx) => {
    if (values.endMode === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(values.endDate)) {
        ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Informe a data de fim' });
      } else if (values.endDate < values.startDate) {
        ctx.addIssue({
          code: 'custom',
          path: ['endDate'],
          message: 'A data de fim não pode ser anterior à data de início',
        });
      }
    }
    if (
      values.endMode === 'installments' &&
      (!Number.isInteger(values.installments) ||
        values.installments < 1 ||
        values.installments > 360)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['installments'],
        message: 'Informe de 1 a 360 parcelas',
      });
    }
  });

type ExpenseForm = z.infer<typeof schema>;
type EndMode = ExpenseForm['endMode'];

const SERVER_FIELDS = [
  'name',
  'description',
  'categoryId',
  'paymentMethodId',
  'amountCents',
  'frequency',
  'interval',
  'startDate',
  'endDate',
  'installments',
] as const;

const Section = styled.fieldset`
  border: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};

  legend {
    padding: 0;
    margin-bottom: ${({ theme }) => theme.space[2]};
    font-size: ${({ theme }) => theme.font.size.sm};
    font-weight: ${({ theme }) => theme.font.weight.semibold};
  }
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[5]};
`;

const Divider = styled.hr`
  width: 100%;
  margin: 0;
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
`;

const Help = styled.p`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.textSubtle};
`;

function defaultsFor(expense?: Expense): ExpenseForm {
  if (!expense) {
    return {
      name: '',
      description: '',
      categoryId: '',
      paymentMethodId: '',
      amountCents: 0,
      frequency: 'MONTHLY',
      interval: 1,
      startDate: todayIso(),
      endMode: 'none',
      endDate: '',
      installments: 12,
    };
  }
  const endMode: EndMode = expense.installmentCount
    ? 'installments'
    : expense.endDate
      ? 'date'
      : 'none';
  return {
    name: expense.name,
    description: expense.description ?? '',
    categoryId: expense.category.id,
    paymentMethodId: expense.paymentMethod?.id ?? '',
    amountCents: expense.currentAmountCents,
    frequency: expense.frequency,
    interval: expense.interval,
    startDate: expense.startDate,
    endMode,
    endDate: expense.installmentCount ? '' : (expense.endDate ?? ''),
    installments: expense.installmentCount ?? 12,
  };
}

function toRuleInput(values: ExpenseForm): ExpenseRuleInput {
  return {
    name: values.name,
    description: values.description || null,
    categoryId: values.categoryId,
    frequency: values.frequency,
    interval: values.interval,
    startDate: values.startDate,
    endDate: values.endMode === 'date' ? values.endDate : null,
    installments: values.endMode === 'installments' ? values.installments : null,
  };
}

interface ExpenseFormModalProps {
  open: boolean;
  /** Ausente = criar um novo gasto. */
  expense?: Expense;
  onClose: () => void;
}

export function ExpenseFormModal({ open, expense, onClose }: ExpenseFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={expense ? 'Editar gasto' : 'Novo gasto fixo'}
      width={600}
    >
      <ExpenseFormContent expense={expense} onClose={onClose} />
    </Modal>
  );
}

function ExpenseFormContent({ expense, onClose }: Omit<ExpenseFormModalProps, 'open'>) {
  const toast = useToast();
  const categories = useCategories();
  const paymentMethods = usePaymentMethods();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  // No modo edição, o detalhe traz o histórico de valores.
  const detail = useExpense(expense?.id);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(schema),
    defaultValues: defaultsFor(expense),
  });

  const [frequency, interval, endMode] = useWatch({
    control,
    name: ['frequency', 'interval', 'endMode'],
  });
  const [unitSingular, unitPlural] = FREQUENCY_UNIT[frequency];

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (expense) {
        await updateExpense.mutateAsync({ id: expense.id, ...toRuleInput(values) });
        toast.success('Gasto atualizado');
      } else {
        await createExpense.mutateAsync({
          ...toRuleInput(values),
          amountCents: values.amountCents,
          paymentMethodId: values.paymentMethodId || null,
        });
        toast.success('Gasto cadastrado');
      }
      onClose();
    } catch (error) {
      if (!applyFieldErrors(error, setError, SERVER_FIELDS)) {
        setFormError(errorMessage(error));
      }
    }
  });

  if (categories.isPending) return <CenteredSpinner />;

  const form = (
    <Form onSubmit={onSubmit} noValidate>
      {formError && <FormError>{formError}</FormError>}

      <Section>
        <legend>O quê</legend>
        <Field label="Nome" error={errors.name?.message}>
          {(a11y) => (
            <Input
              {...a11y}
              placeholder="Ex.: Netflix, Aluguel"
              data-autofocus
              {...register('name')}
            />
          )}
        </Field>
        <FieldRow>
          <Field
            label="Categoria"
            error={errors.categoryId?.message}
            hint={categories.data?.length ? undefined : 'Crie uma categoria primeiro'}
          >
            {(a11y) => (
              <Select {...a11y} {...register('categoryId')}>
                <option value="">Escolha…</option>
                {categories.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {!expense && (
            <Field label="Valor" error={errors.amountCents?.message}>
              {(a11y) => (
                <Controller
                  control={control}
                  name="amountCents"
                  render={({ field }) => (
                    <MoneyInput
                      {...a11y}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                  )}
                />
              )}
            </Field>
          )}
        </FieldRow>
        {!expense && (
          <Field
            label="Forma de pagamento (opcional)"
            error={errors.paymentMethodId?.message}
            hint={
              paymentMethods.data?.length === 0
                ? 'Cadastre seus cartões e contas em Carteira'
                : 'Cartão de crédito entra no mês em que a fatura vence'
            }
          >
            {(a11y) => (
              <Select {...a11y} {...register('paymentMethodId')}>
                <PaymentMethodOptions methods={paymentMethods.data ?? []} />
              </Select>
            )}
          </Field>
        )}
        <Field label="Descrição (opcional)" error={errors.description?.message}>
          {(a11y) => <Textarea {...a11y} rows={2} {...register('description')} />}
        </Field>
      </Section>

      <Section>
        <legend>Quando vence</legend>
        <Controller
          control={control}
          name="frequency"
          render={({ field }) => (
            <Segmented<Frequency>
              label="Frequência"
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'WEEKLY', label: 'Semanal' },
                { value: 'MONTHLY', label: 'Mensal' },
                { value: 'YEARLY', label: 'Anual' },
              ]}
            />
          )}
        />
        <FieldRow>
          <Field
            label={`Repetir a cada quantos ${unitPlural}?`}
            error={errors.interval?.message}
            hint={
              Number(interval) === 1
                ? `Todo ${unitSingular}`
                : frequency === 'MONTHLY' && Number(interval) === 3
                  ? 'Trimestral'
                  : frequency === 'MONTHLY' && Number(interval) === 6
                    ? 'Semestral'
                    : undefined
            }
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="number"
                min={1}
                max={24}
                {...register('interval', { valueAsNumber: true })}
              />
            )}
          </Field>
          <Field
            label="Primeiro vencimento"
            error={errors.startDate?.message}
            hint="Define o dia dos próximos vencimentos"
          >
            {(a11y) => <Input {...a11y} type="date" {...register('startDate')} />}
          </Field>
        </FieldRow>
        {frequency === 'MONTHLY' && (
          <Help>
            Vencimentos nos dias 29, 30 ou 31 caem no último dia dos meses mais curtos e voltam ao
            dia certo nos meses seguintes.
          </Help>
        )}
      </Section>

      <Section>
        <legend>Até quando</legend>
        <Controller
          control={control}
          name="endMode"
          render={({ field }) => (
            <Segmented<EndMode>
              label="Fim da cobrança"
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'none', label: 'Sem fim' },
                { value: 'date', label: 'Até uma data' },
                { value: 'installments', label: 'Parcelado' },
              ]}
            />
          )}
        />
        {endMode === 'date' && (
          <Field label="Último vencimento" error={errors.endDate?.message}>
            {(a11y) => <Input {...a11y} type="date" {...register('endDate')} />}
          </Field>
        )}
        {endMode === 'installments' && (
          <Field
            label="Número de parcelas"
            error={errors.installments?.message}
            hint="A data da última parcela é calculada automaticamente"
          >
            {(a11y) => (
              <Input
                {...a11y}
                type="number"
                min={1}
                max={360}
                {...register('installments', { valueAsNumber: true })}
              />
            )}
          </Field>
        )}
      </Section>

      {!expense && categories.data?.length === 0 && (
        <Help>
          Você ainda não tem categorias. <Link to="/categorias">Criar categoria</Link>
        </Help>
      )}

      <ModalActions>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {expense ? 'Salvar alterações' : 'Cadastrar gasto'}
        </Button>
      </ModalActions>
    </Form>
  );

  // O histórico tem seus próprios formulários, então fica FORA do <form> do
  // gasto (form dentro de form é HTML inválido).
  return expense ? (
    <Stack>
      {form}
      <Divider />
      <Section as="section">
        <SectionTitle>Valor e histórico de preço</SectionTitle>
        {detailContent(detail, (data) => (
          <AmountHistory expense={data} />
        ))}
      </Section>
      <Divider />
      <Section as="section">
        <SectionTitle>Forma de pagamento</SectionTitle>
        {detailContent(detail, (data) => (
          <PaymentMethodHistory expense={data} />
        ))}
      </Section>
    </Stack>
  ) : (
    form
  );
}
