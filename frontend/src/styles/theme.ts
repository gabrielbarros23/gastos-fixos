/**
 * Tema central: toda cor, espaçamento e fonte vem daqui. Os dois temas têm
 * exatamente as mesmas chaves, então trocar claro/escuro é trocar o objeto.
 */
const base = {
  font: {
    family: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    size: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
      xl: '1.5rem',
      xxl: '2rem',
    },
    weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  },
  space: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
  },
  radius: { sm: '6px', md: '10px', lg: '16px', full: '999px' },
  transition: '150ms ease',
  layout: { sidebarWidth: '232px', contentMaxWidth: '1180px' },
};

export const lightTheme = {
  ...base,
  mode: 'light' as 'light' | 'dark',
  colors: {
    background: '#F5F6FA',
    surface: '#FFFFFF',
    surfaceMuted: '#F0F2F7',
    border: '#E3E6EE',
    borderStrong: '#CDD2DE',
    text: '#141824',
    textMuted: '#5B6275',
    textSubtle: '#8A91A3',
    primary: '#4F46E5',
    primaryHover: '#4338CA',
    primarySoft: '#EEF0FF',
    onPrimary: '#FFFFFF',
    success: '#047857',
    successSoft: '#E3F6EE',
    warning: '#B45309',
    warningSoft: '#FDF1DC',
    danger: '#C62828',
    dangerSoft: '#FCE8E8',
    overlay: 'rgba(15, 18, 30, 0.45)',
    focus: 'rgba(79, 70, 229, 0.35)',
  },
  shadow: {
    sm: '0 1px 2px rgba(16, 24, 40, 0.06)',
    md: '0 4px 16px rgba(16, 24, 40, 0.08)',
    lg: '0 20px 48px rgba(16, 24, 40, 0.18)',
  },
};

export type AppTheme = typeof lightTheme;

export const darkTheme: AppTheme = {
  ...base,
  mode: 'dark',
  colors: {
    background: '#0C0E14',
    surface: '#151821',
    surfaceMuted: '#1C202B',
    border: '#262B38',
    borderStrong: '#343B4C',
    text: '#E8EAF0',
    textMuted: '#A0A7B8',
    textSubtle: '#6E7688',
    primary: '#8B85FF',
    primaryHover: '#A29DFF',
    primarySoft: '#23224A',
    onPrimary: '#0C0E14',
    success: '#4ADE9A',
    successSoft: '#12291F',
    warning: '#F5B454',
    warningSoft: '#2E2413',
    danger: '#FF7A7A',
    dangerSoft: '#321617',
    overlay: 'rgba(0, 0, 0, 0.6)',
    focus: 'rgba(139, 133, 255, 0.4)',
  },
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.4)',
    md: '0 4px 16px rgba(0, 0, 0, 0.35)',
    lg: '0 20px 48px rgba(0, 0, 0, 0.55)',
  },
};

/** Media queries usadas no layout responsivo (mobile first). */
export const media = {
  tablet: '@media (min-width: 640px)',
  desktop: '@media (min-width: 960px)',
};
