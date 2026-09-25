import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { REFRESH_COOKIE } from './auth/auth.controller.js';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Gastos Fixos API')
    .setDescription(
      'Controle de gastos fixos com calendário, projeção e lembretes por e-mail. ' +
        'Valores sempre em centavos (inteiros) e datas no formato YYYY-MM-DD.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth(REFRESH_COOKIE)
    .build();

  SwaggerModule.setup('api/docs', app, () =>
    SwaggerModule.createDocument(app, config),
  );
}
