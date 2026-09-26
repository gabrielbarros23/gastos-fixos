import styled from 'styled-components';
import { formatShortMonth, type YearMonth } from '../../lib/dates';
import { formatCents, formatCentsCompact } from '../../lib/format';

/** Altura da área das barras; a maior barra ocupa ela inteira. */
const PLOT_HEIGHT = 150;

const Chart = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  align-items: end;
  gap: ${({ theme }) => theme.space[2]};
  padding-top: ${({ theme }) => theme.space[2]};

  @media (min-width: 640px) {
    gap: ${({ theme }) => theme.space[4]};
  }
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 0;
`;

const Value = styled.span`
  font-size: 11px;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.textMuted};
  white-space: nowrap;
`;

const Bar = styled.div<{ $height: number; $highlight: boolean }>`
  width: 100%;
  max-width: 56px;
  height: ${({ $height }) => $height}px;
  min-height: 4px;
  border-radius: 8px 8px 3px 3px;
  background: ${({ theme, $highlight }) =>
    $highlight ? theme.colors.primary : theme.colors.primarySoft};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  transition: height 300ms ease;
`;

const Label = styled.span<{ $highlight: boolean }>`
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme, $highlight }) =>
    $highlight ? theme.font.weight.bold : theme.font.weight.medium};
  color: ${({ theme, $highlight }) => ($highlight ? theme.colors.text : theme.colors.textMuted)};
  text-transform: capitalize;
`;

interface ProjectionChartProps {
  /** O primeiro item é o mês selecionado (destacado); os demais, a projeção. */
  months: { month: YearMonth; expectedCents: number }[];
}

/**
 * Gráfico de barras feito à mão: cada barra é uma div com altura proporcional
 * ao maior valor. Para 7 barras não compensa uma biblioteca de gráficos.
 */
export function ProjectionChart({ months }: ProjectionChartProps) {
  const max = Math.max(...months.map((m) => m.expectedCents), 1);
  return (
    <Chart role="list" aria-label="Total previsto por mês">
      {months.map(({ month, expectedCents }, index) => (
        <Column
          key={month}
          role="listitem"
          aria-label={`${formatShortMonth(month)}: ${formatCents(expectedCents)}`}
        >
          <Value>{formatCentsCompact(expectedCents)}</Value>
          <Bar $height={(expectedCents / max) * PLOT_HEIGHT} $highlight={index === 0} />
          <Label $highlight={index === 0}>{formatShortMonth(month)}</Label>
        </Column>
      ))}
    </Chart>
  );
}
