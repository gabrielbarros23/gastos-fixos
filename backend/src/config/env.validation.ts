// O class-transformer lê os tipos declarados via reflection para converter valores.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
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
