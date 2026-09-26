import request from 'supertest';
import {
  addDays,
  todayIn,
  type CalendarDate,
} from '../src/domain/calendar-date.js';
import {
  createTestApp,
  registerUser,
  resetDatabase,
  type RegisteredUser,
  type TestContext,
} from './utils/test-app.js';

interface Expense {
  id: string;
  startDate: string;
  endDate: string | null;
  installmentCount: number | null;
  isActive: boolean;
  deactivatedAt: string | null;
  currentAmountCents: number;
  nextDueDate: string | null;
  amounts: { id: string; amountCents: number; effectiveFrom: string }[];
}

describe('Gastos fixos (e2e)', () => {
  let ctx: TestContext;
  let user: RegisteredUser;
  let categoryIds: string[];
  let today: CalendarDate;

  const api = () => request(ctx.app.getHttpServer());
  const auth = (u: RegisteredUser = user) => ({
    Authorization: `Bearer ${u.accessToken}`,
  });

  async function listCategoryIds(u: RegisteredUser): Promise<string[]> {
    const res = await api().get('/api/categories').set(auth(u)).expect(200);
    return res.body.map((c: { id: string }) => c.id);
  }

  async function createExpense(
    body: Record<string, unknown> = {},
    owner: RegisteredUser = user,
  ): Promise<Expense> {
    const res = await api()
      .post('/api/expenses')
      .set(auth(owner))
      .send({
        name: 'Netflix',
        categoryId: categoryIds[0],
        amountCents: 5590,
        frequency: 'MONTHLY',
        startDate: '2026-01-10',
        ...body,
      })
      .expect(201);
    return res.body;
  }

  async function getExpense(id: string): Promise<Expense> {
    const res = await api().get(`/api/expenses/${id}`).set(auth()).expect(200);
    return res.body;
  }

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    user = await registerUser(ctx.app);
    categoryIds = await listCategoryIds(user);
    today = todayIn('America/Sao_Paulo');
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('POST /api/expenses', () => {
    it('cria o gasto com o valor inicial vigente a partir do primeiro vencimento', async () => {
      const startDate = addDays(today, 10);

      const res = await api()
        .post('/api/expenses')
        .set(auth())
        .send({
          name: ' Netflix ',
          description: '',
          categoryId: categoryIds[0],
          amountCents: 5590,
          frequency: 'MONTHLY',
          startDate,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        name: 'Netflix',
        description: null,
        category: { id: categoryIds[0], name: 'Moradia', color: '#6366F1' },
        frequency: 'MONTHLY',
        interval: 1,
        startDate,
        endDate: null,
        installmentCount: null,
        isActive: true,
        deactivatedAt: null,
        currentAmountCents: 5590,
        nextDueDate: startDate,
        amounts: [
          {
            id: expect.any(String),
            amountCents: 5590,
            effectiveFrom: startDate,
          },
        ],
      });
    });

    it('calcula a data de fim a partir do número de parcelas', async () => {
      const expense = await createExpense({
        startDate: '2026-01-31',
        installments: 12,
      });

      expect(expense.installmentCount).toBe(12);
      expect(expense.endDate).toBe('2026-12-31');
    });

    it('recusa data de fim e parcelas juntas (400)', async () => {
      const res = await api()
        .post('/api/expenses')
        .set(auth())
        .send({
          name: 'Celular',
          categoryId: categoryIds[0],
          amountCents: 25000,
          frequency: 'MONTHLY',
          startDate: '2026-01-10',
          endDate: '2026-12-10',
          installments: 12,
        })
        .expect(400);

      expect(res.body.details).toContainEqual({
        field: 'endDate',
        message: 'Informe a data de fim OU o número de parcelas, não os dois',
      });
    });

    it('recusa data de fim anterior ao início (400)', async () => {
      const res = await api()
        .post('/api/expenses')
        .set(auth())
        .send({
          name: 'Academia',
          categoryId: categoryIds[0],
          amountCents: 9990,
          frequency: 'MONTHLY',
          startDate: '2026-05-10',
          endDate: '2026-05-09',
        })
        .expect(400);

      expect(res.body.details[0].field).toBe('endDate');
    });

    it('valida data inexistente, centavos não inteiros e frequência desconhecida (400)', async () => {
      const res = await api()
        .post('/api/expenses')
        .set(auth())
        .send({
          name: 'Inválido',
          categoryId: categoryIds[0],
          amountCents: 55.9,
          frequency: 'DAILY',
          startDate: '2026-02-30',
        })
        .expect(400);

      const fields = res.body.details.map((d: { field: string }) => d.field);
      expect(fields).toEqual(
        expect.arrayContaining(['amountCents', 'frequency', 'startDate']),
      );
    });

    it('recusa categoria de outro usuário (404)', async () => {
      const other = await registerUser(ctx.app);
      const [otherCategoryId] = await listCategoryIds(other);

      await api()
        .post('/api/expenses')
        .set(auth())
        .send({
          name: 'Netflix',
          categoryId: otherCategoryId,
          amountCents: 5590,
          frequency: 'MONTHLY',
          startDate: '2026-01-10',
        })
        .expect(404);
    });
  });

  describe('GET /api/expenses', () => {
    it('mostra o próximo vencimento a partir de hoje', async () => {
      // Semanal que começou há 7 dias: o próximo vencimento é hoje.
      const weekly = await createExpense({
        frequency: 'WEEKLY',
        startDate: addDays(today, -7),
      });
      // Parcelado que já terminou: não tem próximo vencimento.
      await createExpense({
        name: 'Parcela quitada',
        startDate: '2024-01-10',
        installments: 3,
      });

      const res = await api().get('/api/expenses').set(auth()).expect(200);

      const byName = Object.fromEntries(
        res.body.map((e: Expense & { name: string }) => [e.name, e]),
      );
      expect(byName['Netflix'].id).toBe(weekly.id);
      expect(byName['Netflix'].nextDueDate).toBe(today);
      expect(byName['Parcela quitada'].nextDueDate).toBeNull();
      expect(byName['Netflix']).not.toHaveProperty('amounts');
    });

    it('filtra por status e por categoria', async () => {
      const active = await createExpense({
        name: 'Aluguel',
        categoryId: categoryIds[0],
      });
      const inactive = await createExpense({
        name: 'Academia',
        categoryId: categoryIds[1],
      });
      await api()
        .post(`/api/expenses/${inactive.id}/deactivate`)
        .set(auth())
        .expect(200);

      const ids = async (query: string) => {
        const res = await api()
          .get(`/api/expenses${query}`)
          .set(auth())
          .expect(200);
        return res.body.map((e: { id: string }) => e.id);
      };

      expect(await ids('')).toEqual([inactive.id, active.id]); // padrão = todos, por nome
      expect(await ids('?status=active')).toEqual([active.id]);
      expect(await ids('?status=inactive')).toEqual([inactive.id]);
      expect(await ids(`?categoryId=${categoryIds[1]}`)).toEqual([inactive.id]);
    });

    it('recusa filtro de status desconhecido (400)', async () => {
      await api().get('/api/expenses?status=deleted').set(auth()).expect(400);
    });
  });

  describe('PATCH /api/expenses/:id', () => {
    it('edita dados e limpa a descrição com null', async () => {
      const expense = await createExpense({ description: 'Plano padrão' });

      const res = await api()
        .patch(`/api/expenses/${expense.id}`)
        .set(auth())
        .send({
          name: 'Netflix Premium',
          description: null,
          categoryId: categoryIds[3],
        })
        .expect(200);

      expect(res.body).toMatchObject({
        name: 'Netflix Premium',
        description: null,
        category: { id: categoryIds[3] },
      });
    });

    it('mudar a data de início move junto o valor inicial', async () => {
      const expense = await createExpense({ startDate: '2026-01-10' });

      const res = await api()
        .patch(`/api/expenses/${expense.id}`)
        .set(auth())
        .send({ startDate: '2026-01-15' })
        .expect(200);

      expect(res.body.startDate).toBe('2026-01-15');
      expect(res.body.amounts).toEqual([
        expect.objectContaining({
          amountCents: 5590,
          effectiveFrom: '2026-01-15',
        }),
      ]);
    });

    it('recalcula a data de fim do parcelado quando a regra muda', async () => {
      const expense = await createExpense({
        startDate: '2026-01-10',
        installments: 6,
      });
      expect(expense.endDate).toBe('2026-06-10');

      // 6 parcelas a cada 2 meses: jan, mar, mai, jul, set, nov
      const res = await api()
        .patch(`/api/expenses/${expense.id}`)
        .set(auth())
        .send({ interval: 2 })
        .expect(200);

      expect(res.body).toMatchObject({
        installmentCount: 6,
        endDate: '2026-11-10',
      });
    });

    it('informar endDate desfaz o parcelamento', async () => {
      const expense = await createExpense({
        startDate: '2026-01-10',
        installments: 6,
      });

      const res = await api()
        .patch(`/api/expenses/${expense.id}`)
        .set(auth())
        .send({ endDate: '2026-03-10' })
        .expect(200);

      expect(res.body).toMatchObject({
        installmentCount: null,
        endDate: '2026-03-10',
      });
    });

    it('não deixa o início passar de uma mudança de valor já registrada (400)', async () => {
      const expense = await createExpense({ startDate: '2026-01-10' });
      await api()
        .post(`/api/expenses/${expense.id}/amounts`)
        .set(auth())
        .send({ amountCents: 5990, effectiveFrom: '2026-06-10' })
        .expect(201);

      const res = await api()
        .patch(`/api/expenses/${expense.id}`)
        .set(auth())
        .send({ startDate: '2026-07-10' })
        .expect(400);

      expect(res.body.details[0].field).toBe('startDate');
    });

    it('recusa null em campo obrigatório (400)', async () => {
      const expense = await createExpense();
      await api()
        .patch(`/api/expenses/${expense.id}`)
        .set(auth())
        .send({ frequency: null })
        .expect(400);
    });
  });

  describe('histórico de valor', () => {
    it('o valor atual passa a ser o novo quando a vigência chega', async () => {
      const expense = await createExpense({ startDate: addDays(today, -60) });

      await api()
        .post(`/api/expenses/${expense.id}/amounts`)
        .set(auth())
        .send({ amountCents: 6490, effectiveFrom: today })
        .expect(201);
      // Um aumento futuro ainda não muda o valor atual
      await api()
        .post(`/api/expenses/${expense.id}/amounts`)
        .set(auth())
        .send({ amountCents: 7990, effectiveFrom: addDays(today, 30) })
        .expect(201);

      const updated = await getExpense(expense.id);
      expect(updated.currentAmountCents).toBe(6490);
      expect(updated.amounts.map((a) => a.amountCents)).toEqual([
        5590, 6490, 7990,
      ]);
    });

    it('recusa duas mudanças na mesma data (409) e vigência antes do início (400)', async () => {
      const expense = await createExpense({ startDate: '2026-01-10' });
      const url = `/api/expenses/${expense.id}/amounts`;

      await api()
        .post(url)
        .set(auth())
        .send({ amountCents: 5990, effectiveFrom: '2026-06-01' })
        .expect(201);
      await api()
        .post(url)
        .set(auth())
        .send({ amountCents: 6990, effectiveFrom: '2026-06-01' })
        .expect(409);
      await api()
        .post(url)
        .set(auth())
        .send({ amountCents: 4990, effectiveFrom: '2025-12-31' })
        .expect(400);
    });

    it('remove uma mudança de valor, mas não o valor inicial', async () => {
      const expense = await createExpense({ startDate: '2026-01-10' });
      const change = await api()
        .post(`/api/expenses/${expense.id}/amounts`)
        .set(auth())
        .send({ amountCents: 5990, effectiveFrom: '2026-06-01' })
        .expect(201);
      const initialId = expense.amounts[0].id;

      await api()
        .delete(`/api/expenses/${expense.id}/amounts/${change.body.id}`)
        .set(auth())
        .expect(204);
      await api()
        .delete(`/api/expenses/${expense.id}/amounts/${initialId}`)
        .set(auth())
        .expect(409);
      await api()
        .delete(`/api/expenses/${expense.id}/amounts/${change.body.id}`)
        .set(auth())
        .expect(404);

      const res = await api()
        .get(`/api/expenses/${expense.id}/amounts`)
        .set(auth())
        .expect(200);
      expect(res.body).toEqual([expect.objectContaining({ id: initialId })]);
    });

    it('corrige um valor digitado errado, inclusive o inicial, e o passado acompanha', async () => {
      // Digitou 559,00 em vez de 55,90
      const expense = await createExpense({
        amountCents: 55900,
        startDate: '2026-01-10',
      });
      const initialId = expense.amounts[0].id;

      const res = await api()
        .patch(`/api/expenses/${expense.id}/amounts/${initialId}`)
        .set(auth())
        .send({ amountCents: 5590 })
        .expect(200);
      expect(res.body).toEqual({
        id: initialId,
        amountCents: 5590,
        effectiveFrom: '2026-01-10',
      });

      const occurrences = await api()
        .get('/api/occurrences?from=2026-01-01&to=2026-01-31')
        .set(auth())
        .expect(200);
      expect(occurrences.body.totalExpectedCents).toBe(5590);
    });

    it('correção de valor valida o corpo (400) e o dono (404)', async () => {
      const expense = await createExpense();
      const url = `/api/expenses/${expense.id}/amounts/${expense.amounts[0].id}`;

      await api().patch(url).set(auth()).send({ amountCents: 0 }).expect(400);
      const other = await registerUser(ctx.app);
      await api()
        .patch(url)
        .set(auth(other))
        .send({ amountCents: 100 })
        .expect(404);
    });
  });

  describe('desativar e reativar', () => {
    it('desativar cancela a partir de hoje; reativar desfaz', async () => {
      // Semanal que começou há 7 dias: vence hoje.
      const expense = await createExpense({
        frequency: 'WEEKLY',
        startDate: addDays(today, -7),
      });
      expect(expense.nextDueDate).toBe(today);

      const deactivated = await api()
        .post(`/api/expenses/${expense.id}/deactivate`)
        .set(auth())
        .expect(200);
      expect(deactivated.body).toMatchObject({
        isActive: false,
        deactivatedAt: today,
        nextDueDate: null, // o vencimento de hoje já não existe
      });

      // Idempotente: desativar de novo não muda nada
      const again = await api()
        .post(`/api/expenses/${expense.id}/deactivate`)
        .set(auth())
        .expect(200);
      expect(again.body.deactivatedAt).toBe(today);

      const reactivated = await api()
        .post(`/api/expenses/${expense.id}/activate`)
        .set(auth())
        .expect(200);
      expect(reactivated.body).toMatchObject({
        isActive: true,
        deactivatedAt: null,
        nextDueDate: today,
      });
    });
  });

  describe('DELETE /api/expenses/:id', () => {
    it('exclui o gasto junto com o histórico de valores', async () => {
      const expense = await createExpense();

      await api().delete(`/api/expenses/${expense.id}`).set(auth()).expect(204);

      await api().get(`/api/expenses/${expense.id}`).set(auth()).expect(404);
      expect(
        await ctx.prisma.expenseAmount.count({
          where: { expenseId: expense.id },
        }),
      ).toBe(0);
    });

    it('com gasto vinculado, a categoria não pode ser excluída (409)', async () => {
      await createExpense({ categoryId: categoryIds[0] });

      await api()
        .delete(`/api/categories/${categoryIds[0]}`)
        .set(auth())
        .expect(409);
    });
  });

  describe('isolamento entre usuários', () => {
    it('um usuário não lê nem altera gastos de outro (404, não 403)', async () => {
      const expense = await createExpense();
      const other = await registerUser(ctx.app);
      const asOther = auth(other);

      const list = await api().get('/api/expenses').set(asOther).expect(200);
      expect(list.body).toEqual([]);

      await api().get(`/api/expenses/${expense.id}`).set(asOther).expect(404);
      await api()
        .patch(`/api/expenses/${expense.id}`)
        .set(asOther)
        .send({ name: 'X' })
        .expect(404);
      await api()
        .post(`/api/expenses/${expense.id}/deactivate`)
        .set(asOther)
        .expect(404);
      await api()
        .get(`/api/expenses/${expense.id}/amounts`)
        .set(asOther)
        .expect(404);
      await api()
        .post(`/api/expenses/${expense.id}/amounts`)
        .set(asOther)
        .send({ amountCents: 1, effectiveFrom: '2026-12-01' })
        .expect(404);
      await api()
        .delete(`/api/expenses/${expense.id}`)
        .set(asOther)
        .expect(404);

      // E nada mudou para o dono
      const mine = await getExpense(expense.id);
      expect(mine.isActive).toBe(true);
      expect(mine.amounts).toHaveLength(1);
    });
  });
});
