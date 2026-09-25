import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';

// Testes e2e: sobem a API inteira contra um PostgreSQL real (banco gastos_test).
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    env: parseEnv(readFileSync('.env.test', 'utf8')),
    globalSetup: ['./test/global-setup.ts'],
    // Todos os arquivos compartilham o mesmo banco, então rodam um de cada vez.
    fileParallelism: false,
    hookTimeout: 30_000,
  },
});
