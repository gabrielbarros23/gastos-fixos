import { ValidateIf } from 'class-validator';

/**
 * Para PATCH: o campo pode ser omitido, mas se vier precisa ser válido, e
 * `null` NÃO é aceito. O @IsOptional() padrão pula a validação também para
 * null, o que deixaria `{ "name": null }` chegar ao banco numa coluna NOT NULL
 * e virar um erro 500 em vez de um 400.
 */
export const IsOptionalNotNull = () =>
  ValidateIf((_object, value: unknown) => value !== undefined);
