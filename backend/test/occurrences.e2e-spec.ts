import request from 'supertest';
import {
  addDays,
  todayIn,
  type CalendarDate,
} from '../src/domain/calendar-date.js';
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

interface OccurrenceBody {
  expenseId: string;
  name: string;
  dueDate: string;
  expectedAmountCents: number;
  installment: { number: number; total: number } | null;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  payment: { paidAmountCents: number; paidAt: string } | null;
}

interface DayBody {
  date: string;
  totalExpectedCents: number;
  totalPaidCents: number;
  occurrences: OccurrenceBody[];
}

describe('Ocorrências e pagamentos (e2e)', () => {
  let ctx: TestContext;
  let user: RegisteredUser;
  let categories: Record<string, string>;
  let today: CalendarDate;

  const api = () => request(ctx.app.getHttpServer());
  const expense = (body: Record<string, unknown>, owner = user) =>
    createExpense(ctx.app, owner, {
      categoryId: categories['Moradia'],
      ...body,
    });

  async function occurrences(from: string, to: string, owner = user) {
    const res = await api()
      .get(`/api/occurrences?from=${from}&to=${to}`)
      .set(authHeader(owner))
      .expect(200);
    return res.body as {
      totalExpectedCents: number;
      totalPaidCents: number;
      days: DayBody[];
    };
  }

  const paymentUrl = (expenseId: string, dueDate: string) =>
    `/api/expenses/${expenseId}/occurrences/${dueDate}/payment`;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    user = await registerUser(ctx.app);
    categories = await categoryIdsByName(ctx.app, user);
    today = todayIn('America/Sao_Paulo');
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('GET /api/occurrences', () => {
    it('agrupa por dia, com o total de cada dia e do período', async () => {
      await expense({
        name: 'Aluguel',
        amountCents: 150000,
        startDate: '2026-01-05',
      });
      await expense({
        name: 'Academia',
        amountCents: 9990,
        startDate: '2026-01-05',
      });
      await expense({
        name: 'Condomínio',
        amountCents: 48000,
        startDate: '2026-01-31',
      });
      const netflix = await expense({
        name: 'Netflix',
        amountCents: 4490,
        startDate: '2026-01-10',
      });
      await api()
        .post(`/api/expenses/${netflix.id}/amounts`)
        .set(authHeader(user))
        .send({ amountCents: 5990, effectiveFrom: '2026-02-15' })
        .expect(201);

      const result = await occurrences('2026-02-01', '2026-03-31');

      const summary = result.days.map((day) => [
        day.date,
        day.totalExpectedCents,
        day.occurrences.map((o) => `${o.name}:${o.expectedAmountCents}`),
      ]);
      expect(summary).toEqual([
        ['2026-02-05', 159990, ['Academia:9990', 'Aluguel:150000']],
        ['2026-02-10', 4490, ['Netflix:4490']], // antes do aumento (vigente em 15/02)
        ['2026-02-28', 48000, ['Condomínio:48000']], // dia 31 em fevereiro
        ['2026-03-05', 159990, ['Academia:9990', 'Aluguel:150000']],
        ['2026-03-10', 5990, ['Netflix:5990']], // depois do aumento
        ['2026-03-31', 48000, ['Condomínio:48000']], // volta ao dia 31
      ]);
      expect(result.totalExpectedCents).toBe(
        2 * 159990 + 4490 + 5990 + 2 * 48000,
      );
      expect(result.totalPaidCents).toBe(0);
    });

    it('mostra o número da parcela e para na última', async () => {
      await expense({
        name: 'Fone',
        amountCents: 10000,
        startDate: '2026-01-20',
        installments: 3,
      });

      const result = await occurrences('2026-01-01', '2026-04-30');

      expect(
        result.days.map((d) => [d.date, d.occurrences[0].installment]),
      ).toEqual([
        ['2026-01-20', { number: 1, total: 3 }],
        ['2026-02-20', { number: 2, total: 3 }],
        ['2026-03-20', { number: 3, total: 3 }],
      ]);
    });

    it('gasto desativado mantém os vencimentos anteriores e perde os futuros', async () => {
      const gym = await expense({
        name: 'Academia',
        amountCents: 9990,
        startDate: '2026-01-15',
      });
      await api()
        .post(`/api/expenses/${gym.id}/deactivate`)
        .set(authHeader(user))
        .expect(200);

      const past = await occurrences('2026-01-01', '2026-03-31');
      expect(past.days).toHaveLength(3);

      const future = await occurrences(addDays(today, 1), addDays(today, 60));
      expect(future.days).toEqual([]);
    });

    it('status: vencido e não pago é OVERDUE; a vencer é PENDING', async () => {
      await expense({
        name: 'Internet',
        amountCents: 9900,
        startDate: addDays(today, -1),
      });

      const result = await occurrences(addDays(today, -1), addDays(today, 40));

      expect(result.days.map((d) => d.occurrences[0].status)).toEqual([
        'OVERDUE',
        'PENDING',
      ]);
    });

    it('valida o período (400)', async () => {
      const get = (query: string) =>
        api().get(`/api/occurrences${query}`).set(authHeader(user));

      await get('').expect(400);
      await get('?from=2026-03-01&to=2026-02-01').expect(400); // fim antes do início
      await get('?from=2026-01-01&to=2027-01-02').expect(400); // 367 dias
      await get('?from=2026-01-01&to=2026-12-31').expect(200); // 365 dias
      await get('?from=2026-02-30&to=2026-03-31').expect(400); // data inexistente
    });

    it('não mostra vencimentos de outro usuário', async () => {
      await expense({
        name: 'Aluguel',
        amountCents: 150000,
        startDate: '2026-01-05',
      });
      const other = await registerUser(ctx.app);

      const result = await occurrences('2026-01-01', '2026-01-31', other);
      expect(result.days).toEqual([]);
    });
  });

  describe('pagamentos', () => {
    it('sem corpo, marca como pago hoje com o valor previsto', async () => {
      const netflix = await expense({
        name: 'Netflix',
        amountCents: 4490,
        startDate: '2026-01-10',
      });

      const res = await api()
        .put(paymentUrl(netflix.id, '2026-02-10'))
        .set(authHeader(user))
        .expect(200);

      expect(res.body).toMatchObject({
        expenseId: netflix.id,
        dueDate: '2026-02-10',
        expectedAmountCents: 4490,
        status: 'PAID',
        payment: { paidAmountCents: 4490, paidAt: today },
      });

      const [day] = (await occurrences('2026-02-01', '2026-02-28')).days;
      expect(day.totalPaidCents).toBe(4490);
      expect(day.occurrences[0].status).toBe('PAID');
    });

    it('aceita valor pago diferente do previsto; repetir o PUT substitui o pagamento', async () => {
      const netflix = await expense({
        name: 'Netflix',
        amountCents: 4490,
        startDate: '2026-01-10',
      });
      const url = paymentUrl(netflix.id, '2026-02-10');

      await api()
        .put(url)
        .set(authHeader(user))
        .send({ paidAmountCents: 5000, paidAt: '2026-02-12' })
        .expect(200);
      const res = await api()
        .put(url)
        .set(authHeader(user))
        .send({ paidAmountCents: 4800, paidAt: '2026-02-11' })
        .expect(200);

      expect(res.body.expectedAmountCents).toBe(4490);
      expect(res.body.payment).toEqual({
        paidAmountCents: 4800,
        paidAt: '2026-02-11',
      });
      expect(await ctx.prisma.payment.count()).toBe(1);
    });

    it('recusa data que não é vencimento do gasto (404), data inválida e pagamento no futuro (400)', async () => {
      const netflix = await expense({
        name: 'Netflix',
        amountCents: 4490,
        startDate: '2026-01-10',
      });
      const put = (dueDate: string, body = {}) =>
        api()
          .put(paymentUrl(netflix.id, dueDate))
          .set(authHeader(user))
          .send(body);

      await put('2026-02-11').expect(404); // o vencimento é dia 10
      await put('2025-12-10').expect(404); // antes do início
      await put('2026-02-30').expect(400);
      const future = await put('2026-02-10', {
        paidAt: addDays(today, 1),
      }).expect(400);
      expect(future.body.details[0].field).toBe('paidAt');
    });

    it('desmarcar volta a ocorrência para em aberto (e é idempotente)', async () => {
      const netflix = await expense({
        name: 'Netflix',
        amountCents: 4490,
        startDate: '2026-01-10',
      });
      const url = paymentUrl(netflix.id, '2026-02-10');
      await api().put(url).set(authHeader(user)).expect(200);

      await api().delete(url).set(authHeader(user)).expect(204);
      await api().delete(url).set(authHeader(user)).expect(204);

      const [day] = (await occurrences('2026-02-01', '2026-02-28')).days;
      expect(day.occurrences[0]).toMatchObject({
        status: 'OVERDUE',
        payment: null,
      });
    });

    it('o pagamento continua aparecendo depois que o dia de vencimento muda', async () => {
      const netflix = await expense({
        name: 'Netflix',
        amountCents: 4490,
        startDate: '2026-01-10',
      });
      await api()
        .put(paymentUrl(netflix.id, '2026-02-10'))
        .set(authHeader(user))
        .expect(200);

      await api()
        .patch(`/api/expenses/${netflix.id}`)
        .set(authHeader(user))
        .send({ startDate: '2026-01-15' })
        .expect(200);

      const [paidDay, newDueDay] = (
        await occurrences('2026-02-01', '2026-02-28')
      ).days;
      expect(paidDay).toMatchObject({
        date: '2026-02-10',
        totalPaidCents: 4490,
      });
      expect(newDueDay.date).toBe('2026-02-15');
      expect(newDueDay.occurrences[0].payment).toBeNull();

      // E o pagamento antigo ainda pode ser corrigido
      await api()
        .put(paymentUrl(netflix.id, '2026-02-10'))
        .set(authHeader(user))
        .send({ paidAmountCents: 4000 })
        .expect(200);
    });

    it('um usuário não marca nem desmarca pagamento de outro (404)', async () => {
      const netflix = await expense({
        name: 'Netflix',
        amountCents: 4490,
        startDate: '2026-01-10',
      });
      const other = await registerUser(ctx.app);
      const url = paymentUrl(netflix.id, '2026-02-10');

      await api().put(url).set(authHeader(other)).expect(404);
      await api().delete(url).set(authHeader(other)).expect(404);
    });

    it('excluir o gasto apaga os pagamentos junto', async () => {
      const netflix = await expense({
        name: 'Netflix',
        amountCents: 4490,
        startDate: '2026-01-10',
      });
      await api()
        .put(paymentUrl(netflix.id, '2026-02-10'))
        .set(authHeader(user))
        .expect(200);

      await api()
        .delete(`/api/expenses/${netflix.id}`)
        .set(authHeader(user))
        .expect(204);

      expect(await ctx.prisma.payment.count()).toBe(0);
    });
  });
});
