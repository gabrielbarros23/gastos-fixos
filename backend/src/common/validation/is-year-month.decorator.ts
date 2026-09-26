import { ValidateBy, ValidationOptions } from 'class-validator';
import { isValidYearMonth } from '../../domain/year-month.js';

/** Mês no formato `YYYY-MM` (ex.: 2026-10). */
export function IsYearMonth(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isYearMonth',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && isValidYearMonth(value),
        defaultMessage: (args) =>
          `${args?.property} deve ser um mês no formato AAAA-MM`,
      },
    },
    options,
  );
}
