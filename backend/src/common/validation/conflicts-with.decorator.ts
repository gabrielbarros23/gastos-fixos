import { ValidateBy, ValidationOptions } from 'class-validator';

/**
 * Os dois campos não podem vir preenchidos ao mesmo tempo
 * (ex.: `endDate` OU `installments`). O erro sai no formato padrão, por campo.
 */
export function ConflictsWith(property: string, options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'conflictsWith',
      constraints: [property],
      validator: {
        validate: (value: unknown, args) => {
          const object = args?.object as Record<string, unknown> | undefined;
          return value == null || object?.[property] == null;
        },
        defaultMessage: (args) =>
          `${args?.property} e ${property} não podem ser informados juntos`,
      },
    },
    options,
  );
}
