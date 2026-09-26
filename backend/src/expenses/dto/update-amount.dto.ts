import { IsAmountCents } from '../../common/validation/is-amount-cents.decorator.js';

/** Correção do valor de um registro do histórico (a data de vigência não muda). */
export class UpdateAmountDto {
  @IsAmountCents()
  amountCents: number;
}
