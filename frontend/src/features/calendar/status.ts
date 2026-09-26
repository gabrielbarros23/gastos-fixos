import type { OccurrenceStatus } from '../../api/types';

export const STATUS_LABEL: Record<OccurrenceStatus, string> = {
  PAID: 'Pago',
  PENDING: 'A vencer',
  OVERDUE: 'Atrasado',
};

export const STATUS_TONE = {
  PAID: 'success',
  PENDING: 'neutral',
  OVERDUE: 'danger',
} as const satisfies Record<OccurrenceStatus, string>;
