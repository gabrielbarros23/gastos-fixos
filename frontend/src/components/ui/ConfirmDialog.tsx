import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Button } from './Button';
import { FormError } from './Field';
import { Modal, ModalActions } from './Modal';

const Message = styled.div`
  color: ${({ theme }) => theme.colors.textMuted};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[4]};
`;

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  tone = 'danger',
  loading,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={440}>
      <Message>{children}</Message>
      {error && <FormError>{error}</FormError>}
      <ModalActions>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant={tone} loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </ModalActions>
    </Modal>
  );
}
