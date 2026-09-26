import request from 'supertest';
import {
  createTestApp,
  registerUser,
  resetDatabase,
  type RegisteredUser,
  type TestContext,
} from './utils/test-app.js';

describe('Categorias (e2e)', () => {
  let ctx: TestContext;
  let user: RegisteredUser;

  const api = () => request(ctx.app.getHttpServer());
  const auth = (u: RegisteredUser = user) => ({
    Authorization: `Bearer ${u.accessToken}`,
  });

  async function createCategory(
    body: { name: string; color: string },
    owner: RegisteredUser = user,
  ): Promise<{ id: string; name: string; color: string }> {
    const res = await api()
      .post('/api/categories')
      .set(auth(owner))
      .send(body)
      .expect(201);
    return res.body;
  }

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    user = await registerUser(ctx.app);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('o cadastro já cria as 5 categorias padrão', async () => {
    const res = await api().get('/api/categories').set(auth()).expect(200);

    expect(res.body.map((c: { name: string }) => c.name)).toEqual([
      'Moradia',
      'Outros',
      'Saúde',
      'Streaming',
      'Transporte',
    ]);
    expect(res.body[0]).toEqual({
      id: expect.any(String),
      name: 'Moradia',
      color: '#6366F1',
      expenseCount: 0,
    });
  });

  describe('POST /api/categories', () => {
    it('cria a categoria com a cor normalizada em maiúsculas', async () => {
      const category = await createCategory({
        name: '  Educação ',
        color: '#a1b2c3',
      });

      expect(category).toMatchObject({
        name: 'Educação',
        color: '#A1B2C3',
        expenseCount: 0,
      });
    });

    it('recusa nome repetido, mesmo com maiúsculas diferentes (409)', async () => {
      const res = await api()
        .post('/api/categories')
        .set(auth())
        .send({ name: 'MORADIA', color: '#000000' })
        .expect(409);

      expect(res.body.message).toBe('Já existe uma categoria com esse nome');
    });

    it('valida nome e cor (400)', async () => {
      const res = await api()
        .post('/api/categories')
        .set(auth())
        .send({ name: '', color: 'vermelho' })
        .expect(400);

      const fields = res.body.details.map((d: { field: string }) => d.field);
      expect(fields).toEqual(expect.arrayContaining(['name', 'color']));
    });

    it('exige autenticação (401)', async () => {
      await api()
        .post('/api/categories')
        .send({ name: 'X', color: '#000000' })
        .expect(401);
    });
  });

  describe('PATCH /api/categories/:id', () => {
    it('renomeia e troca a cor', async () => {
      const category = await createCategory({
        name: 'Educação',
        color: '#111111',
      });

      const res = await api()
        .patch(`/api/categories/${category.id}`)
        .set(auth())
        .send({ name: 'Cursos', color: '#222222' })
        .expect(200);

      expect(res.body).toMatchObject({
        id: category.id,
        name: 'Cursos',
        color: '#222222',
      });
    });

    it('recusa renomear para um nome que já existe (409)', async () => {
      const category = await createCategory({
        name: 'Educação',
        color: '#111111',
      });

      await api()
        .patch(`/api/categories/${category.id}`)
        .set(auth())
        .send({ name: 'streaming' })
        .expect(409);
    });

    it('recusa null em campo obrigatório (400, e não erro 500 do banco)', async () => {
      const category = await createCategory({
        name: 'Educação',
        color: '#111111',
      });

      await api()
        .patch(`/api/categories/${category.id}`)
        .set(auth())
        .send({ name: null })
        .expect(400);
    });

    it('recusa ID que não é UUID (400)', async () => {
      await api()
        .patch('/api/categories/abc')
        .set(auth())
        .send({ name: 'X' })
        .expect(400);
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('exclui categoria sem gastos', async () => {
      const category = await createCategory({
        name: 'Educação',
        color: '#111111',
      });

      await api()
        .delete(`/api/categories/${category.id}`)
        .set(auth())
        .expect(204);

      const res = await api().get('/api/categories').set(auth()).expect(200);
      expect(res.body.map((c: { id: string }) => c.id)).not.toContain(
        category.id,
      );
    });

    it('recusa excluir categoria com gastos (409) e mostra a contagem na listagem', async () => {
      const category = await createCategory({
        name: 'Educação',
        color: '#111111',
      });
      await ctx.prisma.expense.create({
        data: {
          userId: user.id,
          categoryId: category.id,
          name: 'Inglês',
          frequency: 'MONTHLY',
          startDate: new Date('2026-01-10T00:00:00Z'),
          amounts: {
            create: {
              amountCents: 30000,
              effectiveFrom: new Date('2026-01-10T00:00:00Z'),
            },
          },
        },
      });

      const res = await api()
        .delete(`/api/categories/${category.id}`)
        .set(auth())
        .expect(409);
      expect(res.body.message).toMatch(/gastos vinculados/);

      const list = await api().get('/api/categories').set(auth()).expect(200);
      const education = list.body.find(
        (c: { id: string }) => c.id === category.id,
      );
      expect(education.expenseCount).toBe(1);
    });
  });

  describe('isolamento entre usuários', () => {
    it('um usuário não vê nem altera categorias de outro (404, não 403)', async () => {
      const other = await registerUser(ctx.app);
      const category = await createCategory({
        name: 'Privada',
        color: '#111111',
      });

      const otherList = await api()
        .get('/api/categories')
        .set(auth(other))
        .expect(200);
      expect(otherList.body.map((c: { id: string }) => c.id)).not.toContain(
        category.id,
      );

      await api()
        .patch(`/api/categories/${category.id}`)
        .set(auth(other))
        .send({ name: 'Invadida' })
        .expect(404);
      await api()
        .delete(`/api/categories/${category.id}`)
        .set(auth(other))
        .expect(404);
    });

    it('o mesmo nome pode existir para usuários diferentes', async () => {
      const other = await registerUser(ctx.app);
      await createCategory({ name: 'Pets', color: '#111111' });
      await createCategory({ name: 'Pets', color: '#111111' }, other);
    });
  });
});
