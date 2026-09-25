import {
  IsEmail,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NormalizeEmail, Trim } from '../../common/validation/transformers.js';
import { MaxBytes } from '../../common/validation/max-bytes.decorator.js';

export class RegisterDto {
  /** @example "Gabriel" */
  @Trim()
  @IsString()
  @Length(2, 100, { message: 'O nome deve ter entre 2 e 100 caracteres' })
  name: string;

  /** @example "gabriel@email.com" */
  @NormalizeEmail()
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254, { message: 'E-mail inválido' })
  email: string;

  /** Mínimo de 8 caracteres. @example "senha-forte-123" */
  @IsString()
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
  @MaxBytes(72, { message: 'A senha é longa demais' })
  password: string;
}
