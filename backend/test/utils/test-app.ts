import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

export interface TestContext {
  app: INestApplication<Server>;
  prisma: PrismaService;
}

/** Sobe a API completa, com a mesma configuração global do main.ts. */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication<Server>>();
  configureApp(app);
  await app.init();

  return { app, prisma: app.get(PrismaService) };
}

/** Apaga os dados de todas as tabelas (menos o controle de migrations). */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;

  const names = tables.map(({ tablename }) => `"${tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${names} RESTART IDENTITY CASCADE`);
}

export interface RegisteredUser {
  id: string;
  email: string;
  password: string;
  accessToken: string;
  refreshCookie: string;
}

let userCounter = 0;

/** Cadastra um usuário novo via API e devolve os tokens. */
export async function registerUser(
  app: INestApplication<Server>,
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<RegisteredUser> {
  userCounter += 1;
  const body = {
    name: 'Usuário de Teste',
    email: `user${userCounter}@test.com`,
    password: 'senha-forte-123',
    ...overrides,
  };

  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send(body)
    .expect(201);

  return {
    id: res.body.user.id,
    email: body.email,
    password: body.password,
    accessToken: res.body.accessToken,
    refreshCookie: getRefreshCookie(res),
  };
}

export function authHeader(user: RegisteredUser): { Authorization: string } {
  return { Authorization: `Bearer ${user.accessToken}` };
}

/** IDs das categorias do usuário, por nome (as 5 padrão já existem). */
export async function categoryIdsByName(
  app: INestApplication<Server>,
  user: RegisteredUser,
): Promise<Record<string, string>> {
  const res = await request(app.getHttpServer())
    .get('/api/categories')
    .set(authHeader(user))
    .expect(200);
  return Object.fromEntries(
    res.body.map((c: { id: string; name: string }) => [c.name, c.id]),
  );
}

/** Cria um gasto via API e devolve o corpo da resposta. */
export async function createExpense(
  app: INestApplication<Server>,
  user: RegisteredUser,
  body: Record<string, unknown>,
): Promise<
  { id: string; amounts: { id: string }[] } & Record<string, unknown>
> {
  const res = await request(app.getHttpServer())
    .post('/api/expenses')
    .set(authHeader(user))
    .send({ frequency: 'MONTHLY', ...body })
    .expect(201);
  return res.body;
}

/** Extrai o par `refresh_token=<valor>` do Set-Cookie, pronto para reenviar. */
export function getRefreshCookie(res: request.Response): string {
  const header = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = header?.find((c) => c.startsWith('refresh_token='));
  if (!cookie) {
    throw new Error('Resposta sem cookie refresh_token');
  }
  return cookie.split(';')[0];
}
