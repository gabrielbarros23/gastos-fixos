import { AlertTriangle, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { errorMessage } from '../../api/errors';
import { Button } from './Button';

const Box = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[10]} ${({ theme }) => theme.space[4]};
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const IconCircle = styled.div<{ $danger?: boolean }>`
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: ${({ theme, $danger }) =>
    $danger ? theme.colors.dangerSoft : theme.colors.primarySoft};
  color: ${({ theme, $danger }) => ($danger ? theme.colors.danger : theme.colors.primary)};
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const Description = styled.p`
  max-width: 360px;
  font-size: ${({ theme }) => theme.font.size.sm};
`;

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Box>
      <IconCircle>
        <Icon size={24} />
      </IconCircle>
      <Title>{title}</Title>
      {description && <Description>{description}</Description>}
      {action}
    </Box>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Box role="alert">
      <IconCircle $danger>
        <AlertTriangle size={24} />
      </IconCircle>
      <Title>Não foi possível carregar</Title>
      <Description>{errorMessage(error)}</Description>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </Box>
  );
}
