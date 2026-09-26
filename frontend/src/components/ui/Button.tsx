import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const variants = {
  primary: css`
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.onPrimary};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.colors.primaryHover};
    }
  `,
  secondary: css`
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.borderStrong};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.colors.surfaceMuted};
    }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.colors.textMuted};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.colors.surfaceMuted};
      color: ${({ theme }) => theme.colors.text};
    }
  `,
  danger: css`
    background: ${({ theme }) => theme.colors.danger};
    color: #fff;
    &:hover:not(:disabled) {
      filter: brightness(1.08);
    }
  `,
};

const StyledButton = styled.button<{ $variant: Variant; $size: Size; $block?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[2]};
  width: ${({ $block }) => ($block ? '100%' : 'auto')};
  min-height: ${({ $size }) => ($size === 'sm' ? '34px' : '42px')};
  padding: 0 ${({ theme, $size }) => ($size === 'sm' ? theme.space[3] : theme.space[4])};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: ${({ theme, $size }) => ($size === 'sm' ? theme.font.size.sm : theme.font.size.md)};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  white-space: nowrap;
  transition:
    background ${({ theme }) => theme.transition},
    color ${({ theme }) => theme.transition};
  ${({ $variant }) => variants[$variant]}

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  svg {
    flex-shrink: 0;
  }
`;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  loading,
  icon,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <StyledButton
      type={type}
      $variant={variant}
      $size={size}
      $block={block}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner $size={16} /> : icon}
      {children}
    </StyledButton>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Obrigatório: vira aria-label (leitor de tela) e tooltip. */
  label: string;
  tone?: 'danger';
}

/** Botão só com ícone. */
export function IconButton({ label, tone, type = 'button', ...rest }: IconButtonProps) {
  return <IconButtonBase type={type} aria-label={label} title={label} $tone={tone} {...rest} />;
}

const IconButtonBase = styled.button<{ $tone?: 'danger' }>`
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  transition: background ${({ theme }) => theme.transition};

  &:hover:not(:disabled) {
    background: ${({ theme, $tone }) =>
      $tone === 'danger' ? theme.colors.dangerSoft : theme.colors.surfaceMuted};
    color: ${({ theme, $tone }) => ($tone === 'danger' ? theme.colors.danger : theme.colors.text)};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
