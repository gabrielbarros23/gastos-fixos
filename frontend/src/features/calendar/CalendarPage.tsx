import { useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import styled from 'styled-components';
import { fetchOccurrences, useOccurrences } from '../../api/occurrences';
import { usePaymentMethods } from '../../api/payment-methods';
import { queryKeys } from '../../api/query-keys';
import type { OccurrenceDay } from '../../api/types';
import { Button, IconButton } from '../../components/ui/Button';
import { Select } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { CenteredSpinner, Spinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/States';
import {
  currentYearMonth,
  formatLongDate,
  formatYearMonth,
  monthGrid,
  shiftYearMonth,
  todayIso,
} from '../../lib/dates';
import { capitalize, formatCents, pluralize } from '../../lib/format';
import { paymentMethodLabel } from '../../lib/payment-methods';
import { useMonthParam } from '../../lib/useMonthParam';
import { MonthGrid } from './MonthGrid';
import { OccurrenceItem } from './OccurrenceItem';

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[4]};
`;

const Stat = styled.div<{ $tone?: 'success' | 'danger' }>`
  padding: ${({ theme }) => theme.space[3]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};

  span {
    display: block;
    font-size: ${({ theme }) => theme.font.size.xs};
    color: ${({ theme }) => theme.colors.textMuted};
  }

  strong {
    display: block;
    white-space: nowrap;
    font-size: ${({ theme }) => theme.font.size.sm};
    color: ${({ theme, $tone }) =>
      $tone === 'success'
        ? theme.colors.success
        : $tone === 'danger'
          ? theme.colors.danger
          : theme.colors.text};

    @media (min-width: 640px) {
      font-size: ${({ theme }) => theme.font.size.lg};
    }
  }
`;

const Filters = styled.div`
  max-width: 320px;
  margin-bottom: ${({ theme }) => theme.space[3]};
`;

const MonthNav = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[4]};
  margin-top: ${({ theme }) => theme.space[3]};
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.textMuted};

  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`;

/* Mesma linguagem das bolinhas do calendário: cheia = em aberto, vazada = paga. */
const Swatch = styled.i<{ $tone: 'pending' | 'paid' | 'overdue' }>`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1.5px solid
    ${({ theme, $tone }) => ($tone === 'overdue' ? theme.colors.danger : theme.colors.textMuted)};
  background: ${({ theme, $tone }) =>
    $tone === 'paid'
      ? 'transparent'
      : $tone === 'overdue'
        ? theme.colors.danger
        : theme.colors.textMuted};
`;

const DayList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const DayFooter = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.space[4]};
  padding-top: ${({ theme }) => theme.space[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
`;

export function CalendarPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [month, setMonth] = useMonthParam();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // Vazio = todas as formas de pagamento.
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const paymentMethods = usePaymentMethods();
  const filter = paymentMethodId || undefined;
  const today = todayIso();

  const grid = useMemo(() => monthGrid(month), [month]);
  const { data, isPending, isError, error, refetch, isFetching } = useOccurrences(
    grid.from,
    grid.to,
    filter,
  );

  // Pré-carrega os meses vizinhos: a navegação fica instantânea.
  useEffect(() => {
    for (const neighbor of [shiftYearMonth(month, -1), shiftYearMonth(month, 1)]) {
      const { from, to } = monthGrid(neighbor);
      void queryClient.prefetchQuery({
        queryKey: queryKeys.occurrencesRange(from, to, filter),
        queryFn: () => fetchOccurrences(from, to, filter),
      });
    }
  }, [month, filter, queryClient]);

  const daysByDate = useMemo(
    () => new Map<string, OccurrenceDay>(data?.days.map((day) => [day.date, day])),
    [data],
  );

  // Totais só do mês (a grade também mostra dias dos meses vizinhos).
  const totals = useMemo(() => {
    const result = { expected: 0, paid: 0, open: 0, overdueCount: 0 };
    for (const day of data?.days ?? []) {
      if (!day.date.startsWith(month)) continue;
      for (const o of day.occurrences) {
        result.expected += o.expectedAmountCents;
        if (o.payment) result.paid += o.payment.paidAmountCents;
        else result.open += o.expectedAmountCents;
        if (o.status === 'OVERDUE') result.overdueCount += 1;
      }
    }
    return result;
  }, [data, month]);

  const selectedDay = selectedDate ? daysByDate.get(selectedDate) : undefined;
  const hasAnyInMonth = data?.days.some((day) => day.date.startsWith(month));

  return (
    <>
      <PageHeader
        title={capitalize(formatYearMonth(month))}
        subtitle="Seus vencimentos do mês. Clique em um dia para ver e marcar como pago."
        actions={
          <MonthNav>
            {isFetching && !isPending && <Spinner $size={16} />}
            <IconButton label="Mês anterior" onClick={() => setMonth(shiftYearMonth(month, -1))}>
              <ChevronLeft size={20} />
            </IconButton>
            <Button variant="secondary" size="sm" onClick={() => setMonth(currentYearMonth())}>
              Hoje
            </Button>
            <IconButton label="Próximo mês" onClick={() => setMonth(shiftYearMonth(month, 1))}>
              <ChevronRight size={20} />
            </IconButton>
          </MonthNav>
        }
      />

      {(paymentMethods.data?.length ?? 0) > 0 && (
        <Filters>
          <Select
            aria-label="Filtrar por forma de pagamento"
            value={paymentMethodId}
            onChange={(event) => setPaymentMethodId(event.target.value)}
          >
            <option value="">Todas as formas de pagamento</option>
            {paymentMethods.data?.map((method) => (
              <option key={method.id} value={method.id}>
                {paymentMethodLabel(method)}
              </option>
            ))}
          </Select>
        </Filters>
      )}

      {isPending ? (
        <CenteredSpinner />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <Stats>
            <Stat>
              <span>Previsto</span>
              <strong>{formatCents(totals.expected)}</strong>
            </Stat>
            <Stat $tone="success">
              <span>Pago</span>
              <strong>{formatCents(totals.paid)}</strong>
            </Stat>
            <Stat $tone={totals.overdueCount > 0 ? 'danger' : undefined}>
              <span>
                Em aberto
                {totals.overdueCount > 0 &&
                  ` · ${pluralize(totals.overdueCount, 'atrasado', 'atrasados')}`}
              </span>
              <strong>{formatCents(totals.open)}</strong>
            </Stat>
          </Stats>

          <MonthGrid
            cells={grid.cells}
            daysByDate={daysByDate}
            today={today}
            onSelectDay={setSelectedDate}
          />

          <Legend aria-hidden>
            <span>
              <Swatch $tone="pending" /> A vencer
            </span>
            <span>
              <Swatch $tone="paid" /> Pago
            </span>
            <span>
              <Swatch $tone="overdue" /> Atrasado
            </span>
          </Legend>

          {!hasAnyInMonth && (
            <EmptyState
              icon={CalendarPlus}
              title={
                filter
                  ? 'Nenhum vencimento nesta forma de pagamento'
                  : 'Nenhum vencimento neste mês'
              }
              description={
                filter
                  ? 'Troque o filtro ou escolha esta forma de pagamento nos seus gastos.'
                  : 'Cadastre seus gastos fixos (aluguel, assinaturas, parcelas) e eles aparecem aqui automaticamente, todo mês.'
              }
              action={
                filter ? undefined : (
                  <Button size="sm" onClick={() => navigate('/gastos')}>
                    Cadastrar gasto
                  </Button>
                )
              }
            />
          )}
        </>
      )}

      <Modal
        open={Boolean(selectedDay)}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? capitalize(formatLongDate(selectedDate)) : ''}
        width={560}
      >
        {selectedDay && (
          <>
            <DayList>
              {selectedDay.occurrences.map((occurrence) => (
                <OccurrenceItem key={occurrence.expenseId} occurrence={occurrence} />
              ))}
            </DayList>
            <DayFooter>
              <span>Total do dia</span>
              <span>{formatCents(selectedDay.totalExpectedCents)}</span>
            </DayFooter>
          </>
        )}
      </Modal>
    </>
  );
}
