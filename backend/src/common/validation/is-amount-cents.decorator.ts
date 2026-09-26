import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

/** R$ 1.000.000,00 em centavos: teto de sanidade para um gasto fixo. */
export const MAX_AMOUNT_CENTS = 100_000_000;

/**
 * Dinheiro sempre em centavos inteiros (R$ 55,90 = 5590), nunca float:
 * 0.1 + 0.2 !== 0.3 em ponto flutuante, e somas de centenas de valores
 * acumulariam erro.
 */
export function IsAmountCents() {
  return applyDecorators(
    ApiProperty({
      type: 'integer',
      minimum: 1,
      maximum: MAX_AMOUNT_CENTS,
      description: 'Valor em centavos (R$ 55,90 = 5590)',
      example: 5590,
    }),
    IsInt({ message: 'O valor deve ser um número inteiro de centavos' }),
    Min(1, { message: 'O valor deve ser maior que zero' }),
    Max(MAX_AMOUNT_CENTS, {
      message: 'O valor excede o limite de R$ 1.000.000,00',
    }),
  );
}
