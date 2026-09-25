import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import type { Env } from '../config/env.validation.js';
import type { User } from '../generated/prisma/client.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import type { AccessTokenPayload } from './jwt-auth.guard.js';
import { RefreshTokensService } from './refresh-tokens.service.js';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: UserResponseDto;
}

@Injectable()
export class AuthService {
  private readonly saltRounds: number;
  /**
   * Hash de uma senha qualquer, usado no login quando o e-mail não existe. Assim
   * o bcrypt roda nos dois casos e o tempo de resposta não revela quais e-mails
   * têm conta (user enumeration por timing).
   */
  private readonly dummyHash: Promise<string>;

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokensService,
    config: ConfigService<Env, true>,
  ) {
    this.saltRounds = config.get('BCRYPT_SALT_ROUNDS', { infer: true });
    this.dummyHash = hash(randomUUID(), this.saltRounds);
  }

  async register(dto: RegisterDto): Promise<AuthSession> {
    const passwordHash = await hash(dto.password, this.saltRounds);
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
    return this.startSession(user);
  }

  async login(dto: LoginDto): Promise<AuthSession> {
    const user = await this.users.findByEmail(dto.email);
    const passwordMatches = await compare(
      dto.password,
      user?.passwordHash ?? (await this.dummyHash),
    );

    // Mesma mensagem para e-mail inexistente e senha errada.
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    return this.startSession(user);
  }

  async refresh(refreshToken: string | undefined): Promise<AuthSession> {
    if (!refreshToken) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }
    const rotated = await this.refreshTokens.rotate(refreshToken);
    const user = await this.users.getById(rotated.userId);
    return {
      accessToken: await this.signAccessToken(user.id),
      refreshToken: rotated.token,
      user: UserResponseDto.from(user),
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) {
      await this.refreshTokens.revokeSession(refreshToken);
    }
  }

  private async startSession(user: User): Promise<AuthSession> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user.id),
      this.refreshTokens.issue(user.id),
    ]);
    return { accessToken, refreshToken, user: UserResponseDto.from(user) };
  }

  private signAccessToken(userId: string): Promise<string> {
    const payload: AccessTokenPayload = { sub: userId };
    return this.jwt.signAsync(payload);
  }
}
