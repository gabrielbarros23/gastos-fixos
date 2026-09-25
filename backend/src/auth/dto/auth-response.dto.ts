import { UserResponseDto } from '../../users/dto/user-response.dto.js';

/**
 * Resposta de register/login/refresh. O refresh token NÃO vem aqui: ele vai
 * num cookie httpOnly, que o JavaScript da página não consegue ler.
 */
export class AuthResponseDto {
  /** JWT de curta duração. Enviar como `Authorization: Bearer <token>`. */
  accessToken: string;
  user: UserResponseDto;
}
