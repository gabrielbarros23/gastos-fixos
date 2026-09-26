import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as authApi from '../api/auth';
import { refreshSession, setSessionExpiredHandler } from '../api/client';
import type { User } from '../api/types';

type AuthState =
  { status: 'loading' } | { status: 'authenticated'; user: User } | { status: 'anonymous' };

interface AuthContextValue {
  state: AuthState;
  login: (input: authApi.LoginInput) => Promise<void>;
  register: (input: authApi.RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  /** Atualiza os dados do usuário em memória (ex.: depois de salvar as configurações). */
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const endSession = useCallback(() => {
    queryClient.clear(); // não deixa dados de um usuário no cache do próximo
    setState({ status: 'anonymous' });
  }, [queryClient]);

  // Ao abrir o app, tenta restaurar a sessão com o cookie de refresh.
  useEffect(() => {
    let cancelled = false;
    refreshSession()
      .then(({ user }) => !cancelled && setState({ status: 'authenticated', user }))
      .catch(() => !cancelled && setState({ status: 'anonymous' }));
    return () => {
      cancelled = true;
    };
  }, []);

  // Se um refresh falhar no meio do uso (sessão expirou/revogada), volta ao login.
  useEffect(() => setSessionExpiredHandler(endSession), [endSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      login: async (input) => {
        const { user } = await authApi.login(input);
        setState({ status: 'authenticated', user });
      },
      register: async (input) => {
        const { user } = await authApi.register(input);
        setState({ status: 'authenticated', user });
      },
      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          endSession();
        }
      },
      setUser: (user) => setState({ status: 'authenticated', user }),
    }),
    [state, endSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  }
  return context;
}

/** Usuário logado (só usar dentro de rotas protegidas). */
export function useCurrentUser(): User {
  const { state } = useAuth();
  if (state.status !== 'authenticated') {
    throw new Error('useCurrentUser usado fora de uma rota autenticada');
  }
  return state.user;
}
