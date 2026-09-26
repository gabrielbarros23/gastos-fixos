import { ValidateBy, ValidationOptions } from 'class-validator';
import { isValidCalendarDate } from '../../domain/calendar-date.js';

// Limite de sanidade: evita lixo como o ano 0001 ou 9999 chegando às regras.
const MIN_YEAR = 1900;
const MAX_YEAR = 2200;

/**
 * Data de calendário `YYYY-MM-DD` que existe de verdade (rejeita 2026-02-30).
 * Não aceita data com hora: vencimento não tem fuso.
 */
export function IsCalendarDate(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isCalendarDate',
      validator: {
        validate: (value: unknown) => {
          if (typeof value !== 'string' || !isValidCalendarDate(value)) {
            return false;
          }
          const year = Number(value.slice(0, 4));
          return year >= MIN_YEAR && year <= MAX_YEAR;
        },
        defaultMessage: (args) =>
          `${args?.property} deve ser uma data válida no formato AAAA-MM-DD`,
      },
    },
    options,
  );
}
