import { IsBoolean, IsInt, IsString, Length, Max, Min } from 'class-validator';
import { IsOptionalNotNull } from '../../common/validation/is-optional-not-null.decorator.js';
import { Trim } from '../../common/validation/transformers.js';

export const MAX_REMINDER_DAYS_BEFORE = 30;

export class UpdateMeDto {
  @IsOptionalNotNull()
  @Trim()
  @IsString()
  @Length(2, 100, { message: 'O nome deve ter entre 2 e 100 caracteres' })
  name?: string;

  @IsOptionalNotNull()
  @IsBoolean({ message: 'remindersEnabled deve ser true ou false' })
  remindersEnabled?: boolean;

  /** 0 = no próprio dia do vencimento */
  @IsOptionalNotNull()
  @IsInt({ message: 'reminderDaysBefore deve ser um número inteiro' })
  @Min(0, { message: 'reminderDaysBefore não pode ser negativo' })
  @Max(MAX_REMINDER_DAYS_BEFORE, {
    message: `reminderDaysBefore deve ser no máximo ${MAX_REMINDER_DAYS_BEFORE}`,
  })
  reminderDaysBefore?: number;
}
