import { Transform } from 'class-transformer';

/** Remove espaços nas pontas de strings. */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

/** E-mail normalizado: sem espaços e em minúsculas, para o unique funcionar. */
export const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
