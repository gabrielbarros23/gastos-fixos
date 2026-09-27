import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import type { ErrorDetail } from './all-exceptions.filter.js';

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true, // remove campos que não estão no DTO...
    forbidNonWhitelisted: true, // ...e rejeita a requisição se vierem (pega erro de digitação do cliente)
    transform: true, // entrega instâncias do DTO já com os tipos convertidos

    exceptionFactory: (errors) =>
      new BadRequestException({
        message: 'Dados inválidos',
        details: flattenValidationErrors(errors),
      }),
  });
}

/** Transforma a árvore de erros do class-validator numa lista `{ field, message }`. */
function flattenValidationErrors(
  errors: ValidationError[],
  parentPath?: string,
): ErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;

    const own = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message,
    }));
    return [...own, ...flattenValidationErrors(error.children ?? [], field)];
  });
}
