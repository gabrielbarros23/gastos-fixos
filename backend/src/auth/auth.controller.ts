import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { Public } from '../common/auth/public.decorator.js';
import { NodeEnv, type Env } from '../config/env.validation.js';
import { AuthService, type AuthSession } from './auth.service.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { RefreshTokensService } from './refresh-tokens.service.js';

export const REFRESH_COOKIE = 'refresh_token';

/** Limite mais rígido nas rotas que aceitam senha: freia força bruta. */
const CREDENTIALS_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  private readonly cookieOptions: CookieOptions;

  constructor(
    private readonly auth: AuthService,
    refreshTokens: RefreshTokensService,
    config: ConfigService<Env, true>,
  ) {
    this.cookieOptions = {
      httpOnly: true, // inacessível ao JavaScript da página (protege contra XSS)
      secure: config.get('NODE_ENV', { infer: true }) === NodeEnv.Production,
      sameSite: 'strict', // o navegador não envia o cookie em requisições de outros sites (CSRF)
      path: '/api/auth', // só vai nas rotas de auth, não em toda requisição
      maxAge: refreshTokens.ttlMilliseconds,
    };
  }

  /** Cria a conta e já inicia a sessão */
  @Post('register')
  @Throttle(CREDENTIALS_THROTTLE)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.respondWithSession(res, await this.auth.register(dto));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(CREDENTIALS_THROTTLE)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.respondWithSession(res, await this.auth.login(dto));
  }

  /** Troca o refresh token (cookie) por um novo access token e um novo refresh token */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_COOKIE)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    try {
      const session = await this.auth.refresh(req.cookies?.[REFRESH_COOKIE]);
      return this.respondWithSession(res, session);
    } catch (error) {
      // Cookie inválido não serve para nada: remove para o front não ficar tentando.
      this.clearRefreshCookie(res);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(REFRESH_COOKIE)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    this.clearRefreshCookie(res);
  }

  private respondWithSession(
    res: Response,
    session: AuthSession,
  ): AuthResponseDto {
    res.cookie(REFRESH_COOKIE, session.refreshToken, this.cookieOptions);
    return { accessToken: session.accessToken, user: session.user };
  }

  private clearRefreshCookie(res: Response): void {
    const { maxAge: _maxAge, ...options } = this.cookieOptions;
    res.clearCookie(REFRESH_COOKIE, options);
  }
}
