import { Check } from 'lucide-react';
import styled, { css } from 'styled-components';
import type { Occurrence, OccurrenceDay } from '../../api/types';
import { WEEKDAY_LABELS, type CalendarCell } from '../../lib/dates';
import { formatCents, pluralize } from '../../lib/format';

const MAX_CHIPS = 3;

const Wrapper = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.shadow.sm};
`;

const Weekdays = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceMuted};

  span {
    padding: ${({ theme }) => theme.space[2]} 0;
    text-align: center;
    font-size: ${({ theme }) => theme.font.size.xs};
    font-weight: ${({ theme }) => theme.font.weight.semibold};
    color: ${({ theme }) => theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
`;

const Cell = styled.button<{ $inMonth: boolean; $today: boolean; $hasItems: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  min-width: 0;
  min-height: 64px;
  padding: 6px;
  border: none;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme, $inMonth }) => ($inMonth ? 'transparent' : theme.colors.surfaceMuted)};
  color: inherit;
  text-align: left;
  cursor: ${({ $hasItems }) => ($hasItems ? 'pointer' : 'default')};
  transition: background ${({ theme }) => theme.transition};

  &:nth-child(7n) {
    border-right: none;
  }

  ${({ $hasItems, theme }) =>
    $hasItems &&
    css`
      &:hover {
        background: ${theme.colors.primarySoft};
      }
    `}

  ${({ $inMonth }) =>
    !$inMonth &&
    css`
      > * {
        opacity: 0.55;
      }
    `}

  @media (min-width: 760px) {
    min-height: 116px;
    padding: 8px;
  }
`;

const DayNumber = styled.span<{ $today: boolean }>`
  align-self: flex-start;
  display: inline-grid;
  place-items: center;
  min-width: 26px;
  height: 26px;
  padding: 0 4px;
  border-radius: 999px;
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme, $today }) => ($today ? theme.font.weight.bold : theme.font.weight.medium)};
  background: ${({ theme, $today }) => ($today ? theme.colors.primary : 'transparent')};
  color: ${({ theme, $today }) => ($today ? theme.colors.onPrimary : 'inherit')};
`;

/* Desktop/tablet: chips com nome e valor. */
const Chips = styled.ul`
  display: none;
  list-style: none;
  margin: 0;
  padding: 0;

  @media (min-width: 760px) {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
`;

const Chip = styled.li<{ $color: string; $status: Occurrence['status'] }>`
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 2px 6px;
  border-left: 3px solid ${({ $color }) => $color};
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  font-size: 11px;
  line-height: 1.5;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  ${({ $status, theme }) =>
    $status === 'PAID' &&
    css`
      color: ${theme.colors.textMuted};
      span {
        text-decoration: line-through;
        text-decoration-color: ${theme.colors.textSubtle};
      }
    `}

  ${({ $status, theme }) =>
    $status === 'OVERDUE' &&
    css`
      background: ${theme.colors.dangerSoft};
      color: ${theme.colors.danger};
      font-weight: ${theme.font.weight.semibold};
    `}

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.success};
  }
`;

const More = styled.li`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textMuted};
  padding-left: 6px;
`;

/* Celular: só bolinhas coloridas, que cabem em células de ~50px. */
const Dots = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 3px;

  @media (min-width: 760px) {
    display: none;
  }
`;

/* Cheia na cor da categoria = em aberto; vazada = paga; vermelha = atrasada. */
const Dot = styled.span<{ $color: string; $status: Occurrence['status'] }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  ${({ $color, $status, theme }) => {
    if ($status === 'PAID') return `border: 1.5px solid ${theme.colors.textSubtle};`;
    if ($status === 'OVERDUE') return `background: ${theme.colors.danger};`;
    return `background: ${$color};`;
  }}
`;

const DayTotal = styled.span`
  display: none;
  margin-top: auto;
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: right;

  @media (min-width: 760px) {
    display: block;
  }
`;

interface MonthGridProps {
  cells: CalendarCell[];
  daysByDate: Map<string, OccurrenceDay>;
  today: string;
  onSelectDay: (date: string) => void;
}

/**
 * Grade mensal feita à mão com CSS Grid: 7 colunas e uma célula por dia.
 * Cada célula mostra os vencimentos (chips no desktop, bolinhas no celular) e
 * o total previsto do dia.
 */
export function MonthGrid({ cells, daysByDate, today, onSelectDay }: MonthGridProps) {
  return (
    <Wrapper>
      <Weekdays aria-hidden>
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </Weekdays>
      <Grid>
        {cells.map((cell) => {
          const day = daysByDate.get(cell.date);
          const occurrences = day?.occurrences ?? [];
          const hasItems = occurrences.length > 0;
          const label = hasItems
            ? `Dia ${cell.day}: ${pluralize(occurrences.length, 'vencimento', 'vencimentos')}, total ${formatCents(day!.totalExpectedCents)}`
            : `Dia ${cell.day}, sem vencimentos`;

          return (
            <Cell
              key={cell.date}
              type="button"
              $inMonth={cell.inMonth}
              $today={cell.date === today}
              $hasItems={hasItems}
              aria-label={label}
              aria-disabled={!hasItems}
              onClick={() => hasItems && onSelectDay(cell.date)}
            >
              <DayNumber $today={cell.date === today}>{cell.day}</DayNumber>
              {hasItems && (
                <>
                  <Chips>
                    {occurrences.slice(0, MAX_CHIPS).map((o) => (
                      <Chip key={o.expenseId} $color={o.category.color} $status={o.status}>
                        {o.status === 'PAID' && <Check size={11} strokeWidth={3} />}
                        <span>{o.name}</span>
                      </Chip>
                    ))}
                    {occurrences.length > MAX_CHIPS && (
                      <More>+{occurrences.length - MAX_CHIPS} mais</More>
                    )}
                  </Chips>
                  <Dots>
                    {occurrences.slice(0, 6).map((o) => (
                      <Dot key={o.expenseId} $color={o.category.color} $status={o.status} />
                    ))}
                  </Dots>
                  <DayTotal>{formatCents(day!.totalExpectedCents)}</DayTotal>
                </>
              )}
            </Cell>
          );
        })}
      </Grid>
    </Wrapper>
  );
}
