import { BadRequestException } from '@nestjs/common';

/**
 * Erro de validação de um campo que só dá para checar no service (depende do
 * estado atual no banco), no mesmo formato dos erros do ValidationPipe.
 */
export function fieldError(
  field: string,
  message: string,
): BadRequestException {
  return new BadRequestException({
    message: 'Dados inválidos',
    details: [{ field, message }],
  });
}
