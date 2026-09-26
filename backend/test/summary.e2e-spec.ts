import request from 'supertest';
import { todayIn } from '../src/domain/calendar-date.js';
import { monthOf } from '../src/domain/year-month.js';
import {
  authHeader,
  categoryIdsByName,
  createExpense,
  createTestApp,
  registerUser,
  resetDatabase,
  type RegisteredUser,
  type TestContext,
} from './utils/test-app.js';

describe('Resumo (e2e)', () => {
  let ctx: TestContext;
  let user: RegisteredUser;
  let categories: Record<string, string>;

  const api = () => request(ctx.app.getHttpServer());
  const pay = (expenseId: string, dueDate: string, paidAmountCents: number) =>
    api()
      .put(`/api/expenses/${expenseId}/occurrences/${dueDate}/payment`)
      .set(authHeader(user))
      .send({ paidAmountCents, paidAt: dueDate })
      .expect(200);

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    user = await registerUser(ctx.app);
    categories = await categoryIdsByName(ctx.app, user);

    const create = (body: Record<string, unknown>) =>
      createExpense(ctx.app, user, body);
    const rent = await create({
      name: 'Aluguel',
      categoryId: categories['Moradia'],
      amountCents: 150000,
      startDate: '2026-01-05',
    });
    const netflix = await create({
      name: 'Netflix',
      categoryId: categories['Streaming'],
      amountCents: 5990,
      startDate: '2026-01-10',
    });
    await create({
      name: 'Academia',
      categoryId: categories['Saúde'],
      amountCents: 9990,
      startDate: '2026-01-05',
    });
    await create({
      name: 'IPVA',
      categoryId: categories['Transporte'],
      frequency: 'YEARLY',
      amountCents: 180000,
      startDate: '2026-06-20',
    });
    await create({
      name: 'Fone',
      categoryId: categories['Outros'],
      amountCents: 10000,
      startDate: '2026-04-15',
      installments: 2,
    });

    // Março/2026: aluguel pago certinho, Netflix pago com juros, academia em aberto.
    await pay(rent.id, '2026-03-05', 150000);
    await pay(netflix.id, '2026-03-10', 6200);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('previsto x pago do mês, com pendente e atrasado', async () => {
    const res = await api()
      .get('/api/summary?month=2026-03')
      .set(authHeader(user))
      .expect(200);

    expect(res.body).toMatchObject({
      month: '2026-03',
      expectedCents: 150000 + 5990 + 9990,
      paidCents: 150000 + 6200, // o que saiu de verdade, com os juros
      pendingCents: 9990,
      overdueCents: 9990, // março já passou
      occurrenceCount: 3,
      paidCount: 2,
    });
  });

  it('divide o mês por categoria, do maior para o menor previsto', async () => {
    const res = await api()
      .get('/api/summary?month=2026-03')
      .set(authHeader(user))
      .expect(200);

    expect(
      res.body.byCategory.map(
        (c: {
          category: { name: string };
          expectedCents: number;
          paidCents: number;
        }) => [c.category.name, c.expectedCents, c.paidCents],
      ),
    ).toEqual([
      ['Moradia', 150000, 150000],
      ['Saúde', 9990, 0],
      ['Streaming', 5990, 6200],
    ]);
  });

  it('projeta os 6 meses seguintes', async () => {
    const res = await api()
      .get('/api/summary?month=2026-03')
      .set(authHeader(user))
      .expect(200);

    const monthly = 150000 + 5990 + 9990;
    expect(res.body.projection).toEqual([
      { month: '2026-04', expectedCents: monthly + 10000 }, // parcela 1/2 do fone
      { month: '2026-05', expectedCents: monthly + 10000 }, // parcela 2/2
      { month: '2026-06', expectedCents: monthly + 180000 }, // IPVA
      { month: '2026-07', expectedCents: monthly },
      { month: '2026-08', expectedCents: monthly },
      { month: '2026-09', expectedCents: monthly },
    ]);
  });

  it('sem o parâmetro, usa o mês atual', async () => {
    const res = await api()
      .get('/api/summary')
      .set(authHeader(user))
      .expect(200);
    expect(res.body.month).toBe(monthOf(todayIn('America/Sao_Paulo')));
  });

  it('recusa mês inválido (400)', async () => {
    await api()
      .get('/api/summary?month=2026-13')
      .set(authHeader(user))
      .expect(400);
  });

  it('não mistura dados de outro usuário', async () => {
    const other = await registerUser(ctx.app);
    const res = await api()
      .get('/api/summary?month=2026-03')
      .set(authHeader(other))
      .expect(200);

    expect(res.body).toMatchObject({
      expectedCents: 0,
      paidCents: 0,
      byCategory: [],
    });
    expect(
      res.body.projection.every(
        (m: { expectedCents: number }) => m.expectedCents === 0,
      ),
    ).toBe(true);
  });
});
