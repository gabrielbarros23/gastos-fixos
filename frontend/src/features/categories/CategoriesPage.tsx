import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import styled from 'styled-components';
import { z } from 'zod';
import { useCategories, useDeleteCategory, useSaveCategory } from '../../api/categories';
import { applyFieldErrors, errorMessage, errorStatus } from '../../api/errors';
import type { Category } from '../../api/types';
import { Button, IconButton } from '../../components/ui/Button';
import { ColorDot } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, Form, FormError, Input } from '../../components/ui/Field';
import { Modal, ModalActions } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { CenteredSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { pluralize } from '../../lib/format';

const PALETTE = [
  '#6366F1',
  '#EC4899',
  '#10B981',
  '#F59E0B',
  '#64748B',
  '#EF4444',
  '#06B6D4',
  '#8B5CF6',
  '#84CC16',
  '#F97316',
  '#14B8A6',
  '#A855F7',
];

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

const Swatches = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
`;

const Swatch = styled.button<{ $color: string; $selected: boolean }>`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid ${({ theme, $selected }) => ($selected ? theme.colors.text : 'transparent')};
  background: ${({ $color }) => $color};
  color: #fff;
`;

const CustomColor = styled.input`
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px dashed ${({ theme }) => theme.colors.borderStrong};
  border-radius: 50%;
  background: none;
  cursor: pointer;

  &::-webkit-color-swatch-wrapper {
    padding: 3px;
  }
  &::-webkit-color-swatch {
    border: none;
    border-radius: 50%;
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
              <Swatches id={id} role="radiogroup" aria-label="Cor da categoria">
                {PALETTE.map((color) => {
                  const selected = field.value.toUpperCase() === color;
                  return (
                    <Swatch
                      key={color}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={color}
                      $color={color}
                      $selected={selected}
                      onClick={() => field.onChange(color)}
                    >
                      {selected && <Check size={16} strokeWidth={3} />}
                    </Swatch>
                  );
                })}
                <CustomColor
                  type="color"
                  aria-label="Outra cor"
                  title="Outra cor"
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                />
              </Swatches>
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
