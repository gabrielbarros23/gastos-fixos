import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Env } from '../config/env.validation.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Hash determinístico (SHA-256) e não bcrypt: o token tem 256 bits aleatórios,
 * então não dá para ser adivinhado por força bruta (bcrypt é lento de propósito
 * para proteger senhas, que têm pouca entropia). E, sendo determinístico,
 * dá para buscar o token pelo hash com um índice.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function invalidRefreshToken(): UnauthorizedException {
  return new UnauthorizedException('Sessão inválida ou expirada');
}

/**
 * Refresh tokens opacos, guardados só como hash, com rotação: cada uso gera um
 * token novo e invalida o anterior. Se um token já usado aparecer de novo,
 * alguém pode ter roubado ele, então a sessão inteira (família) é revogada.
 */
@Injectable()
export class RefreshTokensService {
  private readonly ttlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.ttlMs = config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * DAY_MS;
  }

  get ttlMilliseconds(): number {
    return this.ttlMs;
  }

  /** Cria um token numa família nova (login) ou numa já existente (rotação). */
  async issue(
    userId: string,
    familyId: string = randomUUID(),
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await db.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + this.ttlMs),
      },
    });
    return token;
  }

  /** Troca um token válido por um novo, da mesma família. */
  async rotate(token: string): Promise<{ userId: string; token: string }> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!stored) {
      throw invalidRefreshToken();
    }
    if (stored.revokedAt) {
      await this.revokeFamily(stored.familyId);
      throw invalidRefreshToken();
    }
    if (stored.expiresAt <= new Date()) {
      throw invalidRefreshToken();
    }

    const newToken = await this.prisma.$transaction(async (tx) => {
      // Update condicional: se duas requisições tentarem rotacionar o mesmo
      // token ao mesmo tempo, só uma encontra revokedAt = null e vence.
      const { count } = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (count === 0) {
        return null;
      }
      return this.issue(stored.userId, stored.familyId, tx);
    });

    if (!newToken) {
      await this.revokeFamily(stored.familyId);
      throw invalidRefreshToken();
    }

    return { userId: stored.userId, token: newToken };
  }

  /** Logout: encerra a sessão à qual o token pertence. */
  async revokeSession(token: string): Promise<void> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { familyId: true },
    });
    if (stored) {
      await this.revokeFamily(stored.familyId);
    }
  }

  /**
   * Apaga tokens expirados (roda todo dia, pela fila de manutenção). Tokens
   * revogados mas ainda não expirados ficam: são eles que permitem detectar
   * o reuso de um token roubado.
   */
  async deleteExpired(): Promise<number> {
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return count;
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
