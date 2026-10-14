import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import styled from 'styled-components';
import { z } from 'zod';
import { useCategories, useDeleteCategory, useSaveCategory } from '../../api/categories';
import { applyFieldErrors, errorMessage, errorStatus } from '../../api/errors';
import type { Category } from '../../api/types';
import { Button, IconButton } from '../../components/ui/Button';
import { ColorDot } from '../../components/ui/Card';
import { ColorPicker } from '../../components/ui/ColorPicker';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, Form, FormError, Input } from '../../components/ui/Field';
import { Modal, ModalActions } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { CenteredSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { pluralize } from '../../lib/format';
import { PALETTE } from '../../lib/palette';

const Grid = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
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

  div {
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
    font-size: ${({ theme }) => theme.font.size.xs};
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const schema = z.object({
  name: z.string().trim().min(1, 'Informe o nome').max(50, 'Máximo de 50 caracteres'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Escolha uma cor'),
});
type CategoryForm = z.infer<typeof schema>;

function CategoryFormModal({
  category,
  open,
  onClose,
}: {
  category?: Category;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? 'Editar categoria' : 'Nova categoria'}
      width={440}
    >
      <CategoryFormContent category={category} onClose={onClose} />
    </Modal>
  );
}

function CategoryFormContent({ category, onClose }: { category?: Category; onClose: () => void }) {
  const toast = useToast();
  const save = useSaveCategory();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: category?.name ?? '', color: category?.color ?? PALETTE[0] },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await save.mutateAsync({ id: category?.id, ...values });
      toast.success(category ? 'Categoria atualizada' : 'Categoria criada');
      onClose();
    } catch (error) {
      if (errorStatus(error) === 409) {
        setError('name', { message: 'Já existe uma categoria com esse nome' });
      } else if (!applyFieldErrors(error, setError, ['name', 'color'])) {
        setFormError(errorMessage(error));
      }
    }
  });

  return (
    <Form onSubmit={onSubmit} noValidate>
      {formError && <FormError>{formError}</FormError>}
      <Field label="Nome" error={errors.name?.message}>
        {(a11y) => (
          <Input {...a11y} placeholder="Ex.: Educação" data-autofocus {...register('name')} />
        )}
      </Field>
      <Controller
        control={control}
        name="color"
        render={({ field }) => (
          <Field label="Cor" error={errors.color?.message}>
            {({ id }) => (
              <ColorPicker
                id={id}
                label="Cor da categoria"
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
  | { type: 'edit'; category: Category }
  | { type: 'delete'; category: Category }
  | null;

export function CategoriesPage() {
  const toast = useToast();
  const categories = useCategories();
  const deleteCategory = useDeleteCategory();
  const [dialog, setDialog] = useState<Dialog>(null);

  const close = () => {
    setDialog(null);
    deleteCategory.reset();
  };

  return (
    <>
      <PageHeader
        title="Categorias"
        subtitle="Agrupe seus gastos para ver para onde vai o dinheiro."
        actions={
          <Button icon={<Plus size={18} />} onClick={() => setDialog({ type: 'create' })}>
            Nova categoria
          </Button>
        }
      />

      {categories.isPending ? (
        <CenteredSpinner />
      ) : categories.isError ? (
        <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
      ) : categories.data.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Nenhuma categoria"
          description="Crie categorias como Moradia, Streaming ou Saúde."
        />
      ) : (
        <Grid>
          {categories.data.map((category) => (
            <Item key={category.id}>
              <ColorDot $color={category.color} $size={14} />
              <div>
                <strong>{category.name}</strong>
                <span>{pluralize(category.expenseCount, 'gasto', 'gastos')}</span>
              </div>
              <IconButton label="Editar" onClick={() => setDialog({ type: 'edit', category })}>
                <Pencil size={16} />
              </IconButton>
              <IconButton
                label={
                  category.expenseCount > 0
                    ? 'Mova os gastos para outra categoria antes de excluir'
                    : 'Excluir'
                }
                tone="danger"
                disabled={category.expenseCount > 0}
                onClick={() => setDialog({ type: 'delete', category })}
              >
                <Trash2 size={16} />
              </IconButton>
            </Item>
          ))}
        </Grid>
      )}

      <CategoryFormModal
        open={dialog?.type === 'create' || dialog?.type === 'edit'}
        category={dialog?.type === 'edit' ? dialog.category : undefined}
        onClose={close}
      />

      <ConfirmDialog
        open={dialog?.type === 'delete'}
        title="Excluir categoria?"
        confirmLabel="Excluir"
        loading={deleteCategory.isPending}
        error={deleteCategory.error ? errorMessage(deleteCategory.error) : null}
        onClose={close}
        onConfirm={() =>
          dialog?.type === 'delete' &&
          deleteCategory.mutate(dialog.category.id, {
            onSuccess: () => {
              toast.success('Categoria excluída');
              close();
            },
          })
        }
      >
        <p>
          A categoria <strong>{dialog?.type === 'delete' && dialog.category.name}</strong> será
          excluída.
        </p>
      </ConfirmDialog>
    </>
  );
}
