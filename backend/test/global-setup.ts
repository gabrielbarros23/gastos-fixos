import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

/** Roda uma vez antes da suíte: aplica as migrations no banco de teste. */
export default function setup(): void {
  const testEnv = parseEnv(readFileSync('.env.test', 'utf8'));
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, ...testEnv },
  });
}
