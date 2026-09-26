import type { ReactNode } from 'react';
import styled from 'styled-components';

const Page = styled.div`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: ${({ theme }) => theme.space[4]};
  background:
    radial-gradient(circle at 20% 0%, ${({ theme }) => theme.colors.primarySoft}, transparent 45%),
    ${({ theme }) => theme.colors.background};
`;

const Box = styled.div`
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[6]};
`;

const Brand = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  text-align: center;

  img {
    width: 44px;
    height: 44px;
  }

  h1 {
    font-size: ${({ theme }) => theme.font.size.xl};
    letter-spacing: -0.01em;
  }

  p {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: ${({ theme }) => theme.font.size.sm};
  }
`;

const Panel = styled.div`
  padding: ${({ theme }) => theme.space[6]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadow.md};
`;

export const AuthFooter = styled.p`
  text-align: center;
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.textMuted};

  a {
    font-weight: ${({ theme }) => theme.font.weight.semibold};
    text-decoration: none;
  }
`;

export function AuthLayout({ subtitle, children }: { subtitle: string; children: ReactNode }) {
  return (
    <Page>
      <Box>
        <Brand>
          <img src="/favicon.svg" alt="" />
          <h1>Gastos Fixos</h1>
          <p>{subtitle}</p>
        </Brand>
        <Panel>{children}</Panel>
      </Box>
    </Page>
  );
}
