import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageSpinner } from '../components/ui/Spinner';
import { useAuth } from './AuthProvider';

/** Rotas que exigem login. Guarda a página pedida para voltar a ela depois. */
export function RequireAuth() {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === 'loading') return <FullPageSpinner />;
  if (state.status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/** Login e cadastro: quem já está logado vai direto para o app. */
export function PublicOnly() {
  const { state } = useAuth();

  if (state.status === 'loading') return <FullPageSpinner />;
  if (state.status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}
