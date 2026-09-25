import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from './auth-user.js';

/** Injeta o usuário autenticado no handler: `me(@CurrentUser() user: AuthUser)`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.user) {
      // Só acontece se a rota for @Public() e mesmo assim usar @CurrentUser().
      throw new UnauthorizedException();
    }
    return request.user;
  },
);
