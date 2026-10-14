import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import styled from 'styled-components';
import { z } from 'zod';
import { applyFieldErrors, errorMessage, errorStatus } from '../../api/errors';
import { useSavePaymentMethod } from '../../api/payment-methods';
import type { PaymentMethod, PaymentMethodType } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { ColorPicker } from '../../components/ui/ColorPicker';
import { Field, FieldRow, Form, FormError, Input, Select } from '../../components/ui/Field';
import { Modal, ModalActions } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { PALETTE } from '../../lib/palette';
import {
  isCardType,
  PAYMENT_METHOD_TYPE_LABEL,
  PAYMENT_METHOD_TYPES,
} from '../../lib/payment-methods';

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
    lastDigits: z
      .string()
      .trim()
      .regex(/^(\d{4})?$/, 'Informe os 4 últimos dígitos (ou deixe em branco)'),
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

interface PaymentMethodFormModalProps {
  open: boolean;
  /** Ausente = criar uma nova. */
  method?: PaymentMethod;
  onClose: () => void;
  /** Chamado com a forma salva (ex.: para já selecioná-la num gasto). */
  onSaved?: (method: PaymentMethod) => void;
}

export function PaymentMethodFormModal({
  open,
  method,
  onClose,
  onSaved,
}: PaymentMethodFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={method ? 'Editar forma de pagamento' : 'Nova forma de pagamento'}
      width={480}
    >
      <PaymentMethodFormContent method={method} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

function PaymentMethodFormContent({
  method,
  onClose,
  onSaved,
}: Omit<PaymentMethodFormModalProps, 'open'>) {
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
      lastDigits: method?.lastDigits ?? '',
    },
  });
  const type = useWatch({ control, name: 'type' });
  const isCreditCard = type === 'CREDIT_CARD';
  const isCard = isCardType(type);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const saved = await save.mutateAsync({
        id: method?.id,
        name: values.name,
        type: values.type,
        color: values.color,
        closingDay: isCreditCard ? Number(values.closingDay) : null,
        dueDay: isCreditCard ? Number(values.dueDay) : null,
        lastDigits: isCard && values.lastDigits ? values.lastDigits : null,
      });
      toast.success(method ? 'Forma de pagamento atualizada' : 'Forma de pagamento criada');
      onSaved?.(saved);
      onClose();
    } catch (error) {
      if (errorStatus(error) === 409) {
        setError('name', { message: 'Já existe uma forma de pagamento com esse nome' });
      } else if (
        !applyFieldErrors(error, setError, [
          'name',
          'type',
          'color',
          'closingDay',
          'dueDay',
          'lastDigits',
        ])
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
        <Field
          label="Últimos 4 dígitos (opcional)"
          error={errors.lastDigits?.message}
          hint="Ajuda a diferenciar cartões. Nunca digite o número inteiro."
        >
          {(a11y) => (
            <Input
              {...a11y}
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder="Ex.: 4821"
              style={{ maxWidth: 160 }}
              {...register('lastDigits')}
            />
          )}
        </Field>
      )}

      {isCreditCard && (
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
