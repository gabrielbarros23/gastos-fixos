import {
  CalendarDays,
  ChartColumnBig,
  LogOut,
  Moon,
  ReceiptText,
  Settings,
  Sun,
  Tags,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import styled from 'styled-components';
import { useAuth, useCurrentUser } from '../../auth/AuthProvider';
import { useThemeMode } from '../../styles/ThemeModeProvider';
import { IconButton } from '../ui/Button';

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Calendário', icon: CalendarDays },
  { to: '/resumo', label: 'Resumo', icon: ChartColumnBig },
  { to: '/gastos', label: 'Gastos', icon: ReceiptText },
  { to: '/formas-de-pagamento', label: 'Carteira', icon: Wallet },
  { to: '/categorias', label: 'Categorias', icon: Tags },
  { to: '/configuracoes', label: 'Ajustes', icon: Settings },
];

const Shell = styled.div`
  min-height: 100vh;

  @media (min-width: 960px) {
    display: grid;
    grid-template-columns: ${({ theme }) => theme.layout.sidebarWidth} 1fr;
  }
`;

const Sidebar = styled.aside`
  display: none;

  @media (min-width: 960px) {
    position: sticky;
    top: 0;
    height: 100vh;
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.space[6]};
    padding: ${({ theme }) => theme.space[5]} ${({ theme }) => theme.space[3]};
    border-right: 1px solid ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: 0 ${({ theme }) => theme.space[2]};
  font-weight: ${({ theme }) => theme.font.weight.bold};
  font-size: ${({ theme }) => theme.font.size.lg};
  letter-spacing: -0.01em;

  img {
    width: 28px;
    height: 28px;
  }
`;

const SideNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
`;

const SideLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[2]} ${({ theme }) => theme.space[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  text-decoration: none;
  transition: background ${({ theme }) => theme.transition};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
    color: ${({ theme }) => theme.colors.text};
  }

  &.active {
    background: ${({ theme }) => theme.colors.primarySoft};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const UserBox = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => theme.space[2]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding-top: ${({ theme }) => theme.space[4]};
`;

const UserName = styled.div`
  flex: 1;
  min-width: 0;
  font-size: ${({ theme }) => theme.font.size.sm};

  strong,
  span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: ${({ theme }) => theme.colors.textSubtle};
    font-size: ${({ theme }) => theme.font.size.xs};
  }
`;

const MobileTop = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.space[2]} ${({ theme }) => theme.space[4]};
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (min-width: 960px) {
    display: none;
  }
`;

const Main = styled.main`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.contentMaxWidth};
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[5]} ${({ theme }) => theme.space[4]} 96px;

  @media (min-width: 960px) {
    padding: ${({ theme }) => theme.space[8]};
  }
`;

const BottomNav = styled.nav`
  position: fixed;
  z-index: 10;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(${NAV_ITEMS.length}, 1fr);
  padding-bottom: env(safe-area-inset-bottom);
  background: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  @media (min-width: 960px) {
    display: none;
  }
`;

const BottomLink = styled(NavLink)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: ${({ theme }) => theme.space[2]} 0;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 11px;
  font-weight: ${({ theme }) => theme.font.weight.medium};
  text-decoration: none;

  &.active {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

function ThemeToggle() {
  const { resolvedMode, setPreference } = useThemeMode();
  const next = resolvedMode === 'dark' ? 'light' : 'dark';
  return (
    <IconButton
      label={next === 'dark' ? 'Usar tema escuro' : 'Usar tema claro'}
      onClick={() => setPreference(next)}
    >
      {resolvedMode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </IconButton>
  );
}

/**
 * Layout das páginas logadas: barra lateral no desktop e barra de navegação
 * inferior no celular (mais fácil de alcançar com o polegar).
 */
export function AppLayout() {
  const user = useCurrentUser();
  const { logout } = useAuth();

  return (
    <Shell>
      <Sidebar>
        <Brand>
          <img src="/favicon.svg" alt="" />
          Gastos Fixos
        </Brand>
        <SideNav aria-label="Principal">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <SideLink key={to} to={to} end={to === '/'}>
              <Icon size={18} />
              {label}
            </SideLink>
          ))}
        </SideNav>
        <UserBox>
          <UserName>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </UserName>
          <ThemeToggle />
          <IconButton label="Sair" onClick={() => void logout()}>
            <LogOut size={18} />
          </IconButton>
        </UserBox>
      </Sidebar>

      <div>
        <MobileTop>
          <Brand>
            <img src="/favicon.svg" alt="" />
            Gastos Fixos
          </Brand>
          <ThemeToggle />
        </MobileTop>
        <Main>
          <Outlet />
        </Main>
      </div>

      <BottomNav aria-label="Principal">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <BottomLink key={to} to={to} end={to === '/'}>
            <Icon size={20} />
            {label}
          </BottomLink>
        ))}
      </BottomNav>
    </Shell>
  );
}
