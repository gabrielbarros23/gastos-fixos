import { ChartColumnBig, ChevronLeft, ChevronRight } from 'lucide-react';
import styled, { useTheme } from 'styled-components';
import { useSummary } from '../../api/occurrences';
import type { Summary } from '../../api/types';
import { Button, IconButton } from '../../components/ui/Button';
import { Card, CardTitle, ColorDot } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { PaymentMethodIcon } from '../../components/ui/PaymentMethodIcon';
import { CenteredSpinner, Spinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { currentYearMonth, formatYearMonth, shiftYearMonth } from '../../lib/dates';
import { capitalize, formatCents, pluralize } from '../../lib/format';
import {
  describeInvoice,
  NO_PAYMENT_METHOD,
  PAYMENT_METHOD_TYPE_LABEL,
  paymentMethodLabel,
} from '../../lib/payment-methods';
import { useMonthParam } from '../../lib/useMonthParam';
import { ProjectionChart, type ProjectionSegment } from './ProjectionChart';

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[4]};

  @media (min-width: 900px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const Stat = styled(Card)<{ $tone?: 'success' | 'danger' }>`
  span {
    display: block;
    font-size: ${({ theme }) => theme.font.size.sm};
    color: ${({ theme }) => theme.colors.textMuted};
    margin-bottom: ${({ theme }) => theme.space[1]};
  }
  strong {
    font-size: ${({ theme }) => theme.font.size.xl};
    letter-spacing: -0.01em;
    color: ${({ theme, $tone }) =>
      $tone === 'success'
        ? theme.colors.success
        : $tone === 'danger'
          ? theme.colors.danger
          : theme.colors.text};
  }
`;

const Progress = styled.div`
  margin-bottom: ${({ theme }) => theme.space[4]};

  p {
    display: flex;
    justify-content: space-between;
    font-size: ${({ theme }) => theme.font.size.sm};
    color: ${({ theme }) => theme.colors.textMuted};
    margin-bottom: ${({ theme }) => theme.space[2]};
  }
`;

const Track = styled.div`
  height: 10px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  overflow: hidden;
`;

const Fill = styled.div<{ $percent: number }>`
  width: ${({ $percent }) => $percent}%;
  height: 100%;
  border-radius: inherit;
  background: ${({ theme }) => theme.colors.success};
  transition: width 300ms ease;
`;

const Columns = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]};

  @media (min-width: 900px) {
    /* minmax(0, …): as colunas podem encolher abaixo da largura do conteúdo. */
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  }
`;

const CategoryList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]};
`;

const CategoryRow = styled.li`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const CategoryHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.font.size.sm};

  strong {
    margin-left: auto;
  }
  small {
    color: ${({ theme }) => theme.colors.textSubtle};
  }
`;

const CategoryBar = styled.div<{ $color: string; $percent: number }>`
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.surfaceMuted};

  &::after {
    content: '';
    display: block;
    width: ${({ $percent }) => $percent}%;
    height: 100%;
    border-radius: inherit;
    background: ${({ $color }) => $color};
  }
`;

const MethodGrid = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  /* Quantas colunas couberem, com no mínimo 300px cada (sem forçar rolagem). */
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  gap: ${({ theme }) => theme.space[4]} ${({ theme }) => theme.space[6]};
`;

const MethodRow = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  min-width: 0;
`;

const MethodInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;

  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  small {
    font-size: ${({ theme }) => theme.font.size.xs};
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const MethodAmount = styled.div`
  text-align: right;
  white-space: nowrap;

  strong {
    display: block;
    font-size: ${({ theme }) => theme.font.size.lg};
  }
  small {
    font-size: ${({ theme }) => theme.font.size.xs};
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const SummaryCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.space[4]};
`;

const MonthNav = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
`;

type MethodTotals = Summary['projection'][number]['byPaymentMethod'][number];

/**
 * Segmentos do gráfico numa ordem fixa (alfabética, "sem forma" por último):
 * a mesma forma de pagamento fica sempre na mesma posição da pilha.
 */
function toSegments(items: MethodTotals[]): ProjectionSegment[] {
  return [...items]
    .sort((a, b) => {
      if (!a.paymentMethod || !b.paymentMethod) return a.paymentMethod ? -1 : 1;
      return a.paymentMethod.name.localeCompare(b.paymentMethod.name, 'pt-BR');
    })
    .map(({ paymentMethod, expectedCents }) => ({
      key: paymentMethod?.id ?? 'none',
      label: paymentMethod ? paymentMethodLabel(paymentMethod) : NO_PAYMENT_METHOD,
      color: paymentMethod?.color,
      cents: expectedCents,
    }));
}

export function SummaryPage() {
  const [month, setMonth] = useMonthParam();
  const { data, isPending, isError, error, refetch, isFetching } = useSummary(month);
  const theme = useTheme();

  const header = (
    <PageHeader
      title="Resumo"
      subtitle={`${capitalize(formatYearMonth(month))} · quanto cada forma de pagamento vai cobrar`}
      actions={
        <MonthNav>
          {isFetching && !isPending && <Spinner $size={16} />}
          <IconButton label="Mês anterior" onClick={() => setMonth(shiftYearMonth(month, -1))}>
            <ChevronLeft size={20} />
          </IconButton>
          <Button variant="secondary" size="sm" onClick={() => setMonth(currentYearMonth())}>
            Mês atual
          </Button>
          <IconButton label="Próximo mês" onClick={() => setMonth(shiftYearMonth(month, 1))}>
            <ChevronRight size={20} />
          </IconButton>
        </MonthNav>
      }
    />
  );

  if (isPending)
    return (
      <>
        {header}
        <CenteredSpinner />
      </>
    );
  if (isError)
    return (
      <>
        {header}
        <ErrorState error={error} onRetry={() => void refetch()} />
      </>
    );

  const nothingAtAll =
    data.occurrenceCount === 0 && data.projection.every((m) => m.expectedCents === 0);
  if (nothingAtAll) {
    return (
      <>
        {header}
        <EmptyState
          icon={ChartColumnBig}
          title="Ainda não há o que resumir"
          description="Assim que você cadastrar seus gastos fixos, o resumo mostra o previsto x pago e a projeção dos próximos meses."
        />
      </>
    );
  }

  const paidPercent =
    data.expectedCents > 0 ? Math.min(100, (data.paidCents / data.expectedCents) * 100) : 0;

  return (
    <>
      {header}

      <StatGrid>
        <Stat>
          <span>Previsto</span>
          <strong>{formatCents(data.expectedCents)}</strong>
        </Stat>
        <Stat $tone="success">
          <span>Pago</span>
          <strong>{formatCents(data.paidCents)}</strong>
        </Stat>
        <Stat>
          <span>Em aberto</span>
          <strong>{formatCents(data.pendingCents)}</strong>
        </Stat>
        <Stat $tone={data.overdueCents > 0 ? 'danger' : undefined}>
          <span>Atrasado</span>
          <strong>{formatCents(data.overdueCents)}</strong>
        </Stat>
      </StatGrid>

      <Progress>
        <p>
          <span>
            {data.paidCount} de {data.occurrenceCount} contas pagas
          </span>
          <span>{Math.round(paidPercent)}%</span>
        </p>
        <Track
          role="progressbar"
          aria-label="Quanto do previsto já foi pago"
          aria-valuenow={Math.round(paidPercent)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <Fill $percent={paidPercent} />
        </Track>
      </Progress>

      <SummaryCard>
        <CardTitle>Por forma de pagamento</CardTitle>
        {data.byPaymentMethod.length === 0 ? (
          <p>Nenhuma cobrança neste mês.</p>
        ) : (
          <MethodGrid>
            {data.byPaymentMethod.map(
              ({
                paymentMethod,
                invoice,
                expectedCents,
                paidCents,
                pendingCents,
                occurrenceCount,
              }) => (
                <MethodRow key={paymentMethod?.id ?? 'none'}>
                  <PaymentMethodIcon method={paymentMethod} />
                  <MethodInfo>
                    <strong>
                      {paymentMethod ? paymentMethodLabel(paymentMethod) : NO_PAYMENT_METHOD}
                    </strong>
                    <small>
                      {invoice
                        ? describeInvoice(invoice)
                        : paymentMethod
                          ? PAYMENT_METHOD_TYPE_LABEL[paymentMethod.type]
                          : 'Escolha a forma nos gastos'}
                      {' · '}
                      {pluralize(occurrenceCount, 'conta', 'contas')}
                    </small>
                    <CategoryBar
                      $color={paymentMethod?.color ?? theme.colors.borderStrong}
                      $percent={(expectedCents / data.expectedCents) * 100}
                    />
                  </MethodInfo>
                  <MethodAmount>
                    <strong>{formatCents(expectedCents)}</strong>
                    <small>
                      {pendingCents === 0
                        ? `pago ${formatCents(paidCents)}`
                        : `falta ${formatCents(pendingCents)}`}
                    </small>
                  </MethodAmount>
                </MethodRow>
              ),
            )}
          </MethodGrid>
        )}
      </SummaryCard>

      <Columns>
        <Card>
          <CardTitle>Próximos 6 meses</CardTitle>
          <ProjectionChart
            months={[
              {
                month,
                expectedCents: data.expectedCents,
                segments: toSegments(data.byPaymentMethod),
              },
              ...data.projection.map((m) => ({
                month: m.month,
                expectedCents: m.expectedCents,
                segments: toSegments(m.byPaymentMethod),
              })),
            ]}
          />
        </Card>

        <Card>
          <CardTitle>Por categoria</CardTitle>
          {data.byCategory.length === 0 ? (
            <p>Nenhum vencimento neste mês.</p>
          ) : (
            <CategoryList>
              {data.byCategory.map(({ category, expectedCents, paidCents }) => (
                <CategoryRow key={category.id}>
                  <CategoryHead>
                    <ColorDot $color={category.color} />
                    {category.name}
                    <strong>{formatCents(expectedCents)}</strong>
                  </CategoryHead>
                  <CategoryBar
                    $color={category.color}
                    $percent={(expectedCents / data.expectedCents) * 100}
                  />
                  <CategoryHead>
                    <small>
                      {Math.round((expectedCents / data.expectedCents) * 100)}% do mês · pago{' '}
                      {formatCents(paidCents)}
                    </small>
                  </CategoryHead>
                </CategoryRow>
              ))}
            </CategoryList>
          )}
        </Card>
      </Columns>
    </>
  );
}
