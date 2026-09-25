import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Libera a rota do JwtAuthGuard. As rotas são protegidas por padrão
 * (secure by default): esquecer o decorator gera 401, não um vazamento.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
