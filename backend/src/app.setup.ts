import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/http/all-exceptions.filter.js';
import { createValidationPipe } from './common/http/validation.pipe.js';
import type { Env } from './config/env.validation.js';

/**
 * Configuração global da aplicação. Fica separada do main.ts para que os
 * testes e2e sobam a API exatamente como em produção.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }),
    credentials: true, // permite o envio do cookie de refresh
  });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
}
