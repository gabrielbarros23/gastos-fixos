import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { NormalizeEmail } from '../../common/validation/transformers.js';

export class LoginDto {
  /** @example "gabriel@email.com" */
  @NormalizeEmail()
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  /** @example "senha-forte-123" */
  @IsString()
  @IsNotEmpty({ message: 'Informe a senha' })
  password: string;
}
