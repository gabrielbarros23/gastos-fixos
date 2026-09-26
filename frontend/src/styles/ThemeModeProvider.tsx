import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeProvider } from 'styled-components';
import { GlobalStyle } from './GlobalStyle';
import { darkTheme, lightTheme } from './theme';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeModeContextValue {
  preference: ThemePreference;
  resolvedMode: 'light' | 'dark';
  setPreference: (preference: ThemePreference) => void;
}

const STORAGE_KEY = 'gastos:theme';
const darkQuery = '(prefers-color-scheme: dark)';

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage indisponível (modo privado etc.): segue o sistema.
  }
  return 'system';
}

/** Tema claro/escuro: segue o sistema por padrão e lembra a escolha do usuário. */
export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState(readStoredPreference);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(darkQuery).matches);

  useEffect(() => {
    const query = window.matchMedia(darkQuery);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolvedMode = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeModeContextValue>(
    () => ({
      preference,
      resolvedMode,
      setPreference: (next) => {
        setPreferenceState(next);
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // sem persistência, mas a troca funciona na sessão
        }
      },
    }),
    [preference, resolvedMode],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={resolvedMode === 'dark' ? darkTheme : lightTheme}>
        <GlobalStyle />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode precisa estar dentro de <ThemeModeProvider>');
  }
  return context;
}
