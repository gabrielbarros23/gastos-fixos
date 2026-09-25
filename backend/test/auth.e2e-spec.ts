import request from 'supertest';
import {
  createTestApp,
  getRefreshCookie,
  registerUser,
  resetDatabase,
  type TestContext,
} from './utils/test-app.js';

describe('Autenticação (e2e)', () => {
  let ctx: TestContext;
  const api = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('POST /api/auth/register', () => {
    it('cria a conta, devolve o access token e grava o refresh token em cookie httpOnly', async () => {
      const res = await api()
        .post('/api/auth/register')
        .send({
          name: 'Gabriel',
          email: 'gabriel@test.com',
          password: 'senha-forte-123',
        })
        .expect(201);

      expect(res.body).toEqual({
        accessToken: expect.any(String),
        user: {
          id: expect.any(String),
          name: 'Gabriel',
          email: 'gabriel@test.com',
          remindersEnabled: true,
          reminderDaysBefore: 1,
          createdAt: expect.any(String),
        },
      });

      const cookie = (res.headers['set-cookie'] as unknown as string[])[0];
      expect(cookie).toMatch(/^refresh_token=/);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Path=/api/auth');
    });

    it('salva a senha como hash bcrypt, nunca em texto puro', async () => {
      const user = await registerUser(ctx.app);

      const stored = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(stored.passwordHash).not.toBe(user.password);
      expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
    });

    it('normaliza o e-mail (espaços e maiúsculas)', async () => {
      const res = await api()
        .post('/api/auth/register')
        .send({
          name: 'Gabriel',
          email: '  Gabriel@Test.COM ',
          password: 'senha-forte-123',
        })
        .expect(201);

      expect(res.body.user.email).toBe('gabriel@test.com');
    });

    it('recusa e-mail já cadastrado, sem diferenciar maiúsculas (409)', async () => {
      await registerUser(ctx.app, { email: 'repetido@test.com' });

      const res = await api()
        .post('/api/auth/register')
        .send({
          name: 'Outro',
          email: 'REPETIDO@test.com',
          password: 'senha-forte-123',
        })
        .expect(409);

      expect(res.body.message).toBe('Este e-mail já está cadastrado');
    });

    it('valida o corpo e devolve os erros por campo no formato padrão (400)', async () => {
      const res = await api()
        .post('/api/auth/register')
        .send({ email: 'nao-e-email', password: '123', admin: true })
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Dados inválidos',
        path: '/api/auth/register',
      });
      const fields = res.body.details.map((d: { field: string }) => d.field);
      expect(fields).toEqual(
        expect.arrayContaining(['name', 'email', 'password', 'admin']),
      );
    });

    it('recusa senha com mais de 72 bytes (limite do bcrypt)', async () => {
      // 40 caracteres, mas 80 bytes em UTF-8
      const password = 'é'.repeat(40);
      await api()
        .post('/api/auth/register')
        .send({ name: 'Gabriel', email: 'longa@test.com', password })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('autentica com as credenciais corretas', async () => {
      const user = await registerUser(ctx.app);

      const res = await api()
        .post('/api/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user.id).toBe(user.id);
      expect(getRefreshCookie(res)).toMatch(/^refresh_token=.+/);
    });

    it('responde igual para senha errada e e-mail inexistente (401)', async () => {
      const user = await registerUser(ctx.app);

      const wrongPassword = await api()
        .post('/api/auth/login')
        .send({ email: user.email, password: 'senha-errada' })
        .expect(401);
      const unknownEmail = await api()
        .post('/api/auth/login')
        .send({ email: 'ninguem@test.com', password: 'senha-errada' })
        .expect(401);

      expect(wrongPassword.body.message).toBe('E-mail ou senha inválidos');
      expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
    });
  });

  describe('rotas protegidas', () => {
    it('recusa requisição sem token (401)', async () => {
      await api().get('/api/users/me').expect(401);
    });

    it('recusa token inválido (401)', async () => {
      await api()
        .get('/api/users/me')
        .set('Authorization', 'Bearer token-falso')
        .expect(401);
    });

    it('GET /api/users/me devolve o usuário do token, sem o hash da senha', async () => {
      const user = await registerUser(ctx.app);

      const res = await api()
        .get('/api/users/me')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(user.id);
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('PATCH /api/users/me atualiza as preferências de lembrete', async () => {
      const user = await registerUser(ctx.app);

      const res = await api()
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ remindersEnabled: false, reminderDaysBefore: 3 })
        .expect(200);

      expect(res.body).toMatchObject({
        remindersEnabled: false,
        reminderDaysBefore: 3,
      });
    });

    it('PATCH /api/users/me valida o intervalo de dias do lembrete (400)', async () => {
      const user = await registerUser(ctx.app);

      await api()
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ reminderDaysBefore: 31 })
        .expect(400);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('troca o refresh token por um novo par (rotação)', async () => {
      const user = await registerUser(ctx.app);

      const res = await api()
        .post('/api/auth/refresh')
        .set('Cookie', user.refreshCookie)
        .expect(200);

      const newCookie = getRefreshCookie(res);
      expect(newCookie).not.toBe(user.refreshCookie);

      // O novo access token funciona
      await api()
        .get('/api/users/me')
        .set('Authorization', `Bearer ${res.body.accessToken}`)
        .expect(200);
    });

    it('recusa quando não há cookie (401)', async () => {
      await api().post('/api/auth/refresh').expect(401);
    });

    it('detecta reuso de token já rotacionado e derruba a sessão inteira', async () => {
      const user = await registerUser(ctx.app);

      // Uso legítimo: token A vira token B
      const rotated = await api()
        .post('/api/auth/refresh')
        .set('Cookie', user.refreshCookie)
        .expect(200);
      const tokenB = getRefreshCookie(rotated);

      // Alguém reapresenta o token A (possível roubo)
      await api()
        .post('/api/auth/refresh')
        .set('Cookie', user.refreshCookie)
        .expect(401);

      // Por segurança, o token B (da mesma sessão) também deixou de valer
      await api().post('/api/auth/refresh').set('Cookie', tokenB).expect(401);
    });

    it('não afeta outras sessões do mesmo usuário ao revogar uma', async () => {
      const user = await registerUser(ctx.app);
      const otherSession = await api()
        .post('/api/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);

      await api()
        .post('/api/auth/refresh')
        .set('Cookie', user.refreshCookie)
        .expect(200);
      await api()
        .post('/api/auth/refresh')
        .set('Cookie', user.refreshCookie)
        .expect(401);

      await api()
        .post('/api/auth/refresh')
        .set('Cookie', getRefreshCookie(otherSession))
        .expect(200);
    });

    it('recusa refresh token expirado (401)', async () => {
      const user = await registerUser(ctx.app);
      await ctx.prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await api()
        .post('/api/auth/refresh')
        .set('Cookie', user.refreshCookie)
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('encerra a sessão: o refresh token para de funcionar', async () => {
      const user = await registerUser(ctx.app);

      const res = await api()
        .post('/api/auth/logout')
        .set('Cookie', user.refreshCookie)
        .expect(204);
      expect((res.headers['set-cookie'] as unknown as string[])[0]).toMatch(
        /^refresh_token=;/,
      );

      await api()
        .post('/api/auth/refresh')
        .set('Cookie', user.refreshCookie)
        .expect(401);
    });
  });

  describe('infra', () => {
    it('GET /api/health é público', async () => {
      await api().get('/api/health').expect(200, { status: 'ok' });
    });

    it('rota inexistente devolve 404 no formato padrão', async () => {
      const user = await registerUser(ctx.app);

      const res = await api()
        .get('/api/nao-existe')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);

      expect(res.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
        path: '/api/nao-existe',
        timestamp: expect.any(String),
      });
    });
  });
});
