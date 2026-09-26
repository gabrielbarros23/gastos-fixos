// O class-transformer lê os tipos declarados via reflection para converter valores.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsTimeZone,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

/**
 * Variáveis de ambiente aceitas pela aplicação. São validadas no boot:
 * se algo estiver faltando ou inválido, a API nem sobe (fail fast), em vez de
 * quebrar depois, no meio de uma requisição.
 */
export class Env {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @IsInt()
  @Min(60)
  JWT_ACCESS_TTL_SECONDS: number = 900;

  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL_DAYS: number = 7;

  @IsInt()
  @Min(4)
  @Max(15)
  BCRYPT_SALT_ROUNDS: number = 12;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN: string = 'http://localhost:5173';

  /** Fuso usado para saber "que dia é hoje" (vencimentos são datas sem hora). */
  @IsTimeZone()
  APP_TIMEZONE: string = 'America/Sao_Paulo';

  /** URL do frontend, usada nos links dos e-mails. */
  @IsUrl({ require_tld: false })
  APP_URL: string = 'http://localhost:5173';

  // --- Filas (BullMQ + Redis) ---

  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number = 6379;

  /** Prefixo das chaves no Redis: separa as filas dos testes das de desenvolvimento. */
  @IsString()
  @Matches(/^[\w-]+$/)
  QUEUE_PREFIX: string = 'gastos';

  /** Quando roda a varredura diária de lembretes (cron, no fuso APP_TIMEZONE). */
  @Matches(/^(\S+\s+){4}\S+$/, {
    message: 'REMINDER_CRON deve ter 5 campos (cron)',
  })
  REMINDER_CRON: string = '0 8 * * *';

  // --- E-mail (SMTP; em desenvolvimento, o Mailpit do docker-compose) ---

  @IsString()
  @IsNotEmpty()
  SMTP_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  SMTP_PORT: number = 1025;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASSWORD?: string;

  @IsString()
  @IsNotEmpty()
  MAIL_FROM: string = 'Gastos Fixos <lembretes@gastos.dev>';
}

export function validateEnv(config: Record<string, unknown>): Env {
  // enableImplicitConversion converte "3000" (string do .env) para number
  // usando o tipo declarado na classe.
  const env = plainToInstance(Env, config, { enableImplicitConversion: true });
  const errors = validateSync(env);

  if (errors.length > 0) {
    const lines = errors.map(
      (error) =>
        `  - ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`,
    );
    throw new Error(`Variáveis de ambiente inválidas:\n${lines.join('\n')}`);
  }

  return env;
}
