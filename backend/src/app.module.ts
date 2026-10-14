import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module.js';
import { ClockModule } from './common/clock/clock.module.js';
import { NodeEnv, validateEnv, type Env } from './config/env.validation.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { HealthController } from './health/health.controller.js';
import { OccurrencesModule } from './occurrences/occurrences.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RemindersModule } from './reminders/reminders.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [{ ttl: 60_000, limit: 100 }],
        errorMessage: 'Muitas requisições. Tente novamente em instantes.',
        // Nos testes e2e várias contas são criadas em sequência.
        skipIf: () => config.get('NODE_ENV', { infer: true }) === NodeEnv.Test,
      }),
    }),
    // Conexão única com o Redis para todas as filas do BullMQ.
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: {
          host: config.get('REDIS_HOST', { infer: true }),
          port: config.get('REDIS_PORT', { infer: true }),
        },
        prefix: config.get('QUEUE_PREFIX', { infer: true }),
      }),
    }),
    PrismaModule,
    ClockModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    PaymentMethodsModule,
    ExpensesModule,
    OccurrencesModule,
    PaymentsModule,
    RemindersModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
