import { BadRequestException, Param, ParseUUIDPipe } from '@nestjs/common';

/**
 * `@UuidParam('id')`: valida que o parâmetro de rota é um UUID antes de chegar
 * ao banco (uma string qualquer numa coluna uuid causaria erro no Postgres).
 */
export const UuidParam = (name: string) =>
  Param(
    name,
    new ParseUUIDPipe({
      exceptionFactory: () =>
        new BadRequestException(`O parâmetro "${name}" deve ser um UUID`),
    }),
  );
