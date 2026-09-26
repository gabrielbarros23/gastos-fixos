import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { AuthProvider } from './auth/AuthProvider';
import { PublicOnly, RequireAuth } from './auth/guards';
import { AppLayout } from './components/layout/AppLayout';
import { FullPageSpinner } from './components/ui/Spinner';
import { ToastProvider } from './components/ui/Toast';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ThemeModeProvider } from './styles/ThemeModeProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // 401/404 não melhoram tentando de novo; erro de rede sim.
      retry: (failureCount, error) =>
        failureCount < 2 && !(error as { response?: { status?: number } }).response?.status,
    },
  },
});

/**
 * Cada tela logada vira um arquivo JS separado, baixado só quando a rota é
 * aberta (code splitting): a tela de login carrega sem o código do calendário.
 */
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) => ({
  lazy: async () => ({ Component: (await load())[name] }),
});

const router = createBrowserRouter([
  {
    hydrateFallbackElement: <FullPageSpinner />,
    children: [
      {
        element: <PublicOnly />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/cadastro', element: <RegisterPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                index: true,
                ...page(() => import('./features/calendar/CalendarPage'), 'CalendarPage'),
              },
              {
                path: 'resumo',
                ...page(() => import('./features/summary/SummaryPage'), 'SummaryPage'),
              },
              {
                path: 'gastos',
                ...page(() => import('./features/expenses/ExpensesPage'), 'ExpensesPage'),
              },
              {
                path: 'categorias',
                ...page(() => import('./features/categories/CategoriesPage'), 'CategoriesPage'),
              },
              {
                path: 'configuracoes',
                ...page(() => import('./features/settings/SettingsPage'), 'SettingsPage'),
              },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export function App() {
  return (
    <ThemeModeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeModeProvider>
  );
}
