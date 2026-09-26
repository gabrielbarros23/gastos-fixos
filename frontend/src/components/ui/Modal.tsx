import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import styled from 'styled-components';
import { IconButton } from './Button';

const Dialog = styled.dialog<{ $width: number }>`
  width: min(${({ $width }) => $width}px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  box-shadow: ${({ theme }) => theme.shadow.lg};

  &::backdrop {
    background: ${({ theme }) => theme.colors.overlay};
  }

  /* No celular vira uma "bottom sheet", que é mais fácil de usar com o polegar. */
  @media (max-width: 639px) {
    width: 100%;
    max-width: 100%;
    max-height: 92vh;
    margin: auto 0 0;
    border-radius: ${({ theme }) => theme.radius.lg} ${({ theme }) => theme.radius.lg} 0 0;
  }
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  max-height: inherit;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[4]} ${({ theme }) => theme.space[5]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
`;

const Body = styled.div`
  padding: ${({ theme }) => theme.space[5]};
  overflow-y: auto;
`;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  width?: number;
  children: ReactNode;
}

/**
 * Modal com o <dialog> nativo: o navegador já cuida de prender o foco dentro
 * dele, fechar no Esc e escurecer o fundo. O conteúdo só é montado quando está
 * aberto, então formulários sempre abrem limpos.
 */
export function Modal({ open, onClose, title, width = 520, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // O showModal() foca o primeiro elemento focável (o botão fechar). Em
      // formulários, queremos o primeiro campo: quem quiser marca data-autofocus.
      // (O autoFocus do React não serve aqui: ele roda antes do showModal.)
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <Dialog
      ref={ref}
      $width={width}
      onCancel={(event) => {
        event.preventDefault(); // quem fecha é o estado do React (open=false)
        onClose();
      }}
      onClose={() => {
        // Se o navegador fechar o dialog por conta própria, sincroniza o estado.
        if (open) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose(); // clique fora do painel
      }}
    >
      {open && (
        <Panel>
          <Header>
            <Title>{title}</Title>
            <IconButton label="Fechar" onClick={onClose}>
              <X size={18} />
            </IconButton>
          </Header>
          <Body>{children}</Body>
        </Panel>
      )}
    </Dialog>
  );
}

/** Rodapé de ações de um modal (Cancelar / Salvar). */
export const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space[2]};
  margin-top: ${({ theme }) => theme.space[2]};

  @media (max-width: 639px) {
    flex-direction: column-reverse;
    button {
      width: 100%;
    }
  }
`;
