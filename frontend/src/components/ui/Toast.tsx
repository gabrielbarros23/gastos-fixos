import { CheckCircle2, XCircle } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import styled, { keyframes } from 'styled-components';

type ToastTone = 'success' | 'error';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const slideIn = keyframes`
  from { transform: translateY(8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const Region = styled.div`
  position: fixed;
  z-index: 1000;
  right: ${({ theme }) => theme.space[4]};
  bottom: ${({ theme }) => theme.space[4]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  pointer-events: none;

  /* No celular, acima da barra de navegação inferior. */
  @media (max-width: 959px) {
    left: ${({ theme }) => theme.space[4]};
    bottom: 84px;
  }
`;

const ToastBox = styled.div<{ $tone: ToastTone }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 260px;
  max-width: 420px;
  padding: ${({ theme }) => theme.space[3]} ${({ theme }) => theme.space[4]};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.text};
  color: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  font-size: ${({ theme }) => theme.font.size.sm};
  animation: ${slideIn} 180ms ease-out;

  svg {
    flex-shrink: 0;
    color: ${({ theme, $tone }) =>
      $tone === 'success' ? theme.colors.success : theme.colors.danger};
  }
`;

/** Avisos rápidos de sucesso/erro depois de uma ação ("Pagamento registrado"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const show = useCallback((tone: ToastTone, message: string) => {
    const id = ++nextId.current;
    setToasts((current) => [...current.slice(-2), { id, tone, message }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 4000);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('error', message),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Region aria-live="polite">
        {toasts.map((toast) => (
          <ToastBox key={toast.id} $tone={toast.tone} role="status">
            {toast.tone === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {toast.message}
          </ToastBox>
        ))}
      </Region>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast precisa estar dentro de <ToastProvider>');
  return context;
}
