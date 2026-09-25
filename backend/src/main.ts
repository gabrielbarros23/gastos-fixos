import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { Env } from './config/env.validation.js';
import { setupSwagger } from './swagger.js';

const app = await NestFactory.create(AppModule);
configureApp(app);
setupSwagger(app);

const port = app.get<ConfigService<Env, true>>(ConfigService).get('PORT', {
  infer: true,
});
await app.listen(port);
Logger.log(
  `API em http://localhost:${port}/api (docs em /api/docs)`,
  'Bootstrap',
);
