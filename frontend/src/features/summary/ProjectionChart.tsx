import styled, { type DefaultTheme } from 'styled-components';
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

/** Pilha de segmentos; o vão de 2px deixa a superfície aparecer entre eles. */
const Stack = styled.div<{ $height: number; $highlight: boolean }>`
  display: flex;
  flex-direction: column-reverse;
  gap: 2px;
  width: 100%;
  max-width: 56px;
  height: ${({ $height }) => $height}px;
  min-height: 4px;
  opacity: ${({ $highlight }) => ($highlight ? 1 : 0.72)};
  transition: height 300ms ease;
`;

/**
 * Sem cor = "sem forma de pagamento": listras diagonais em vez de um cinza, para
 * não se confundir com nenhuma cor escolhida pelo usuário (nem para quem não
 * distingue cores).
 */
const fill = ({ theme, $color }: { theme: DefaultTheme; $color?: string }) =>
  $color ??
  `repeating-linear-gradient(45deg, ${theme.colors.textSubtle} 0 2px, ${theme.colors.surfaceMuted} 2px 6px)`;

const Segment = styled.div<{ $color?: string; $grow: number }>`
  flex: ${({ $grow }) => $grow} 1 0;
  min-height: 2px;
  background: ${fill};

  /* Ponta arredondada só no topo da pilha (o último segmento visualmente). */
  &:last-child {
    border-radius: 4px 4px 0 0;
  }
`;

const Label = styled.span<{ $highlight: boolean }>`
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme, $highlight }) =>
    $highlight ? theme.font.weight.bold : theme.font.weight.medium};
  color: ${({ theme, $highlight }) => ($highlight ? theme.colors.text : theme.colors.textMuted)};
  text-transform: capitalize;
`;

const Legend = styled.ul`
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]} ${({ theme }) => theme.space[4]};
  margin: ${({ theme }) => theme.space[4]} 0 0;
  padding: 0;
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.textMuted};

  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`;

const LegendSwatch = styled.i<{ $color?: string }>`
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: ${fill};
`;

export interface ProjectionSegment {
  key: string;
  label: string;
  /** Ausente = cor neutra (ex.: "sem forma de pagamento"). */
  color?: string;
  cents: number;
}

interface ProjectionChartProps {
  /** O primeiro item é o mês selecionado (destacado); os demais, a projeção. */
  months: { month: YearMonth; expectedCents: number; segments: ProjectionSegment[] }[];
}

/**
 * Gráfico de barras empilhadas feito à mão: cada barra tem altura proporcional
 * ao maior total, dividida pelas formas de pagamento do mês. Para 7 barras não
 * compensa uma biblioteca de gráficos.
 */
export function ProjectionChart({ months }: ProjectionChartProps) {
  const max = Math.max(...months.map((m) => m.expectedCents), 1);

  // Legenda: cada forma de pagamento uma vez, na ordem em que aparece.
  const legend = new Map<string, ProjectionSegment>();
  for (const { segments } of months) {
    for (const segment of segments) if (!legend.has(segment.key)) legend.set(segment.key, segment);
  }

  return (
    <>
      <Chart role="list" aria-label="Total previsto por mês">
        {months.map(({ month, expectedCents, segments }, index) => (
          <Column
            key={month}
            role="listitem"
            aria-label={`${formatShortMonth(month)}: ${formatCents(expectedCents)}`}
          >
            <Value>{formatCentsCompact(expectedCents)}</Value>
            <Stack $height={(expectedCents / max) * PLOT_HEIGHT} $highlight={index === 0}>
              {segments
                .filter((segment) => segment.cents > 0)
                .map((segment) => (
                  <Segment
                    key={segment.key}
                    $color={segment.color}
                    $grow={segment.cents}
                    title={`${segment.label}: ${formatCents(segment.cents)}`}
                  />
                ))}
            </Stack>
            <Label $highlight={index === 0}>{formatShortMonth(month)}</Label>
          </Column>
        ))}
      </Chart>
      {legend.size > 1 && (
        <Legend aria-label="Formas de pagamento">
          {[...legend.values()].map((segment) => (
            <li key={segment.key}>
              <LegendSwatch $color={segment.color} />
              {segment.label}
            </li>
          ))}
        </Legend>
      )}
    </>
  );
}
