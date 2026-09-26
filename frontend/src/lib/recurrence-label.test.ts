import { describe, expect, it } from 'vitest';
import { describeRecurrence } from './recurrence-label';

describe('describeRecurrence', () => {
  it.each([
    [{ frequency: 'MONTHLY', interval: 1, startDate: '2026-01-10' }, 'Mensal · dia 10'],
    [{ frequency: 'MONTHLY', interval: 3, startDate: '2026-01-15' }, 'Trimestral · dia 15'],
    [{ frequency: 'MONTHLY', interval: 6, startDate: '2026-04-10' }, 'Semestral · dia 10'],
    [{ frequency: 'MONTHLY', interval: 4, startDate: '2026-04-10' }, 'A cada 4 meses · dia 10'],
    [
      { frequency: 'MONTHLY', interval: 1, startDate: '2026-01-31' },
      'Mensal · dia 31 (ou último dia)',
    ],
    [{ frequency: 'WEEKLY', interval: 1, startDate: '2026-01-05' }, 'Toda segunda'],
    [{ frequency: 'WEEKLY', interval: 1, startDate: '2026-01-10' }, 'Todo sábado'],
    [{ frequency: 'WEEKLY', interval: 2, startDate: '2026-01-07' }, 'A cada 2 semanas · quarta'],
    [{ frequency: 'YEARLY', interval: 1, startDate: '2026-03-20' }, 'Anual · 20/03'],
  ] as const)('%o → %s', (rule, expected) => {
    expect(describeRecurrence(rule)).toBe(expected);
  });
});
