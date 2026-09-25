import type { User } from '../../generated/prisma/client.js';

/**
 * Representação pública do usuário. O mapeamento é explícito (campo a campo)
 * para que o passwordHash nunca saia na resposta por acidente, mesmo que
 * novas colunas sejam adicionadas à tabela.
 */
export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  /** Envia e-mail antes dos vencimentos */
  remindersEnabled: boolean;
  /** Quantos dias antes do vencimento o lembrete é enviado (0 = no próprio dia) */
  reminderDaysBefore: number;
  createdAt: Date;

  static from(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      remindersEnabled: user.remindersEnabled,
      reminderDaysBefore: user.reminderDaysBefore,
      createdAt: user.createdAt,
    };
  }
}
