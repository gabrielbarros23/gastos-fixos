import styled from 'styled-components';

export const Card = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  padding: ${({ theme }) => theme.space[4]};

  ${({ theme }) => `@media (min-width: 640px) { padding: ${theme.space[5]}; }`}
`;

export const CardTitle = styled.h2`
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  margin-bottom: ${({ theme }) => theme.space[4]};
`;

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary';

export const Badge = styled.span<{ $tone?: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
  padding: 2px ${({ theme }) => theme.space[2]};
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  white-space: nowrap;
  ${({ theme, $tone = 'neutral' }) => {
    const map: Record<Tone, [string, string]> = {
      neutral: [theme.colors.surfaceMuted, theme.colors.textMuted],
      success: [theme.colors.successSoft, theme.colors.success],
      warning: [theme.colors.warningSoft, theme.colors.warning],
      danger: [theme.colors.dangerSoft, theme.colors.danger],
      primary: [theme.colors.primarySoft, theme.colors.primary],
    };
    const [background, color] = map[$tone];
    return `background: ${background}; color: ${color};`;
  }}
`;

/** Bolinha com a cor da categoria. */
export const ColorDot = styled.span<{ $color: string; $size?: number }>`
  display: inline-block;
  flex-shrink: 0;
  width: ${({ $size = 10 }) => $size}px;
  height: ${({ $size = 10 }) => $size}px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;
