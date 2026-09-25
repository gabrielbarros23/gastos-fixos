import { NodeEnv, validateEnv } from './env.validation.js';

const required = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('aplica os valores padrão e converte números vindos como string', () => {
    const env = validateEnv({ ...required, PORT: '4000' });

    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe(NodeEnv.Development);
    expect(env.JWT_ACCESS_TTL_SECONDS).toBe(900);
    expect(env.BCRYPT_SALT_ROUNDS).toBe(12);
  });

  it('falha listando todas as variáveis inválidas', () => {
    expect(() =>
      validateEnv({ JWT_ACCESS_SECRET: 'curto', NODE_ENV: 'staging' }),
    ).toThrow(
      /DATABASE_URL[\s\S]*JWT_ACCESS_SECRET|JWT_ACCESS_SECRET[\s\S]*DATABASE_URL/,
    );
  });

  it('recusa custo de bcrypt fora do intervalo seguro', () => {
    expect(() => validateEnv({ ...required, BCRYPT_SALT_ROUNDS: '3' })).toThrow(
      /BCRYPT_SALT_ROUNDS/,
    );
  });
});
