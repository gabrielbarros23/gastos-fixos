import request from 'supertest';
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

interface Method {
  id: string;
  name: string;
}

interface MethodSummary {
  paymentMethod: { name: string } | null;
  invoice: { closingDate: string; dueDate: string } | null;
  expectedCents: number;
}

describe('Formas de pagamento (e2e)', () => {
  let ctx: TestContext;
  let user: RegisteredUser;
  let categoryId: string;

  const api = () => request(ctx.app.getHttpServer());

  const createMethod = async (
    body: Record<string, unknown>,
    owner = user,
  ): Promise<Method> =>
    (
      await api()
        .post('/api/payment-methods')
        .set(authHeader(owner))
        .send({ color: '#8A05BE', ...body })
        .expect(201)
    ).body;

  // Fecha dia 25, vence dia 5 do mês seguinte.
  const nubank = () =>
    createMethod({
      name: 'Nubank',
      type: 'CREDIT_CARD',
      closingDay: 25,
      dueDay: 5,
    });
  const pix = () => createMethod({ name: 'C6 Pix', type: 'PIX' });

  const summary = async (month: string) =>
    (
      await api()
        .get(`/api/summary?month=${month}`)
        .set(authHeader(user))
        .expect(200)
    ).body;

  const occurrences = async (from: string, to: string, query = '') =>
    (
      await api()
        .get(`/api/occurrences?from=${from}&to=${to}${query}`)
        .set(authHeader(user))
        .expect(200)
    ).body;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    user = await registerUser(ctx.app);
    categoryId = (await categoryIdsByName(ctx.app, user))['Streaming'];
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('cadastro', () => {
    it('cria, lista em ordem alfabética e conta os gastos de cada forma', async () => {
      const card = await nubank();
      await pix();
      await createExpense(ctx.app, user, {
        name: 'Netflix',
        categoryId,
        amountCents: 5590,
        startDate: '2030-01-10',
        paymentMethodId: card.id,
      });

      const res = await api()
        .get('/api/payment-methods')
        .set(authHeader(user))
        .expect(200);
      expect(res.body).toEqual([
        {
          id: expect.any(String),
          name: 'C6 Pix',
          type: 'PIX',
          color: '#8A05BE',
          closingDay: null,
          dueDay: null,
          lastDigits: null,
          expenseCount: 0,
        },
        {
          id: card.id,
          name: 'Nubank',
          type: 'CREDIT_CARD',
          color: '#8A05BE',
          closingDay: 25,
          dueDay: 5,
          lastDigits: null,
          expenseCount: 1,
        },
      ]);
    });

    it('cartão de crédito exige os dias da fatura; as outras formas não aceitam', async () => {
      const noDays = await api()
        .post('/api/payment-methods')
        .set(authHeader(user))
        .send({ name: 'Nubank', type: 'CREDIT_CARD', color: '#8A05BE' })
        .expect(400);
      expect(noDays.body.details).toEqual([
        {
          field: 'closingDay',
          message: 'Informe o dia de fechamento da fatura',
        },
      ]);

      const pixWithDays = await api()
        .post('/api/payment-methods')
        .set(authHeader(user))
        .send({ name: 'Pix', type: 'PIX', color: '#000000', closingDay: 10 })
        .expect(400);
      expect(pixWithDays.body.details[0].field).toBe('closingDay');

      await api()
        .post('/api/payment-methods')
        .set(authHeader(user))
        .send({
          name: 'Cartão',
          type: 'CREDIT_CARD',
          color: '#000000',
          closingDay: 32,
          dueDay: 0,
        })
        .expect(400);
    });

    it('últimos 4 dígitos: opcionais, só em cartão, e somem ao deixar de ser cartão', async () => {
      const debit = await createMethod({
        name: 'Débito Itaú',
        type: 'DEBIT_CARD',
        lastDigits: ' 4821 ',
      });
      expect(debit).toMatchObject({ lastDigits: '4821' });

      // Formato inválido e forma que não é cartão
      await api()
        .post('/api/payment-methods')
        .set(authHeader(user))
        .send({
          name: 'X',
          type: 'DEBIT_CARD',
          color: '#000000',
          lastDigits: '48',
        })
        .expect(400);
      const pixWithDigits = await api()
        .post('/api/payment-methods')
        .set(authHeader(user))
        .send({
          name: 'Pix',
          type: 'PIX',
          color: '#000000',
          lastDigits: '1234',
        })
        .expect(400);
      expect(pixWithDigits.body.details[0].field).toBe('lastDigits');

      // Texto vazio apaga; virar Pix também apaga
      const cleared = await api()
        .patch(`/api/payment-methods/${debit.id}`)
        .set(authHeader(user))
        .send({ lastDigits: '' })
        .expect(200);
      expect(cleared.body.lastDigits).toBeNull();
      await api()
        .patch(`/api/payment-methods/${debit.id}`)
        .set(authHeader(user))
        .send({ lastDigits: '9090' })
        .expect(200);
      const pix = await api()
        .patch(`/api/payment-methods/${debit.id}`)
        .set(authHeader(user))
        .send({ type: 'PIX' })
        .expect(200);
      expect(pix.body.lastDigits).toBeNull();
    });

    it('nome único por usuário, sem diferenciar maiúsculas (409)', async () => {
      await nubank();
      await api()
        .post('/api/payment-methods')
        .set(authHeader(user))
        .send({ name: 'NUBANK', type: 'PIX', color: '#000000' })
        .expect(409);
    });

    it('editar: virar cartão exige os dias; deixar de ser cartão apaga os dias', async () => {
      const method = await pix();
      await api()
        .patch(`/api/payment-methods/${method.id}`)
        .set(authHeader(user))
        .send({ type: 'CREDIT_CARD', closingDay: 3 })
        .expect(400);

      const card = await api()
        .patch(`/api/payment-methods/${method.id}`)
        .set(authHeader(user))
        .send({ type: 'CREDIT_CARD', closingDay: 3, dueDay: 10 })
        .expect(200);
      expect(card.body).toMatchObject({ closingDay: 3, dueDay: 10 });

      const back = await api()
        .patch(`/api/payment-methods/${method.id}`)
        .set(authHeader(user))
        .send({ type: 'DEBIT_CARD' })
        .expect(200);
      expect(back.body).toMatchObject({
        type: 'DEBIT_CARD',
        closingDay: null,
        dueDay: null,
      });
    });

    it('não exclui forma usada por algum gasto (409); sem uso, exclui (204)', async () => {
      const card = await nubank();
      const unused = await pix();
      await createExpense(ctx.app, user, {
        name: 'Netflix',
        categoryId,
        amountCents: 5590,
        startDate: '2030-01-10',
        paymentMethodId: card.id,
      });

      await api()
        .delete(`/api/payment-methods/${card.id}`)
        .set(authHeader(user))
        .expect(409);
      await api()
        .delete(`/api/payment-methods/${unused.id}`)
        .set(authHeader(user))
        .expect(204);
    });

    it('forma de pagamento de outro usuário responde 404, inclusive ao criar gasto', async () => {
      const other = await registerUser(ctx.app);
      const foreign = await createMethod(
        { name: 'Alheio', type: 'PIX' },
        other,
      );

      await api()
        .patch(`/api/payment-methods/${foreign.id}`)
        .set(authHeader(user))
        .send({ name: 'Meu' })
        .expect(404);
      await api()
        .post('/api/expenses')
        .set(authHeader(user))
        .send({
          name: 'Netflix',
          categoryId,
          amountCents: 5590,
          frequency: 'MONTHLY',
          startDate: '2030-01-10',
          paymentMethodId: foreign.id,
        })
        .expect(404);
    });
  });

  describe('histórico da forma de pagamento do gasto', () => {
    it('trocar a partir de uma data não muda os meses anteriores', async () => {
      const card = await nubank();
      const other = await pix();
      const netflix = await createExpense(ctx.app, user, {
        name: 'Netflix',
        categoryId,
        amountCents: 5590,
        startDate: '2030-01-10',
        paymentMethodId: card.id,
      });

      await api()
        .post(`/api/expenses/${netflix.id}/payment-methods`)
        .set(authHeader(user))
        .send({ paymentMethodId: other.id, effectiveFrom: '2030-03-10' })
        .expect(201);

      const body = await occurrences('2030-01-01', '2030-04-30');
      const methods = body.days.map(
        (day: { date: string; occurrences: { paymentMethod: Method }[] }) => [
          day.date,
          day.occurrences[0].paymentMethod.name,
        ],
      );
      expect(methods).toEqual([
        ['2030-01-10', 'Nubank'],
        ['2030-02-10', 'Nubank'],
        ['2030-03-10', 'C6 Pix'],
        ['2030-04-10', 'C6 Pix'],
      ]);

      const detail = await api()
        .get(`/api/expenses/${netflix.id}`)
        .set(authHeader(user))
        .expect(200);
      expect(
        detail.body.paymentMethods.map(
          (p: { paymentMethod: Method; effectiveFrom: string }) => [
            p.paymentMethod.name,
            p.effectiveFrom,
          ],
        ),
      ).toEqual([
        ['Nubank', '2030-01-10'],
        ['C6 Pix', '2030-03-10'],
      ]);
    });

    it('null deixa sem forma de pagamento; desfazer a troca volta para a anterior', async () => {
      const card = await nubank();
      const netflix = await createExpense(ctx.app, user, {
        name: 'Netflix',
        categoryId,
        amountCents: 5590,
        startDate: '2030-01-10',
        paymentMethodId: card.id,
      });
      const removal = await api()
        .post(`/api/expenses/${netflix.id}/payment-methods`)
        .set(authHeader(user))
        .send({ paymentMethodId: null, effectiveFrom: '2030-02-10' })
        .expect(201);

      let body = await occurrences('2030-02-01', '2030-02-28');
      expect(body.days[0].occurrences[0].paymentMethod).toBeNull();

      await api()
        .delete(
          `/api/expenses/${netflix.id}/payment-methods/${removal.body.id}`,
        )
        .set(authHeader(user))
        .expect(204);
      body = await occurrences('2030-02-01', '2030-02-28');
      expect(body.days[0].occurrences[0].paymentMethod.name).toBe('Nubank');
    });

    it('corrigir um registro muda também o período passado', async () => {
      const card = await nubank();
      const right = await pix();
      const netflix = await createExpense(ctx.app, user, {
        name: 'Netflix',
        categoryId,
        amountCents: 5590,
        startDate: '2030-01-10',
        paymentMethodId: card.id,
      });
      const detail = await api()
        .get(`/api/expenses/${netflix.id}`)
        .set(authHeader(user));
      const [initial] = detail.body.paymentMethods;

      await api()
        .patch(`/api/expenses/${netflix.id}/payment-methods/${initial.id}`)
        .set(authHeader(user))
        .send({ paymentMethodId: right.id })
        .expect(200);

      const body = await occurrences('2030-01-01', '2030-01-31');
      expect(body.days[0].occurrences[0].paymentMethod.name).toBe('C6 Pix');
    });

    it('valida a vigência: não antes do início (400) nem repetida (409)', async () => {
      const card = await nubank();
      const netflix = await createExpense(ctx.app, user, {
        name: 'Netflix',
        categoryId,
        amountCents: 5590,
        startDate: '2030-01-10',
        paymentMethodId: card.id,
      });
      const add = (effectiveFrom: string) =>
        api()
          .post(`/api/expenses/${netflix.id}/payment-methods`)
          .set(authHeader(user))
          .send({ paymentMethodId: null, effectiveFrom });

      await add('2029-12-10').expect(400);
      await add('2030-01-10').expect(409);
      // paymentMethodId é obrigatório (mesmo que seja null)
      await api()
        .post(`/api/expenses/${netflix.id}/payment-methods`)
        .set(authHeader(user))
        .send({ effectiveFrom: '2030-05-10' })
        .expect(400);
    });

    it('mudar o início do gasto leva junto a forma de pagamento inicial', async () => {
      const card = await nubank();
      const netflix = await createExpense(ctx.app, user, {
        name: 'Netflix',
        categoryId,
        amountCents: 5590,
        startDate: '2030-03-10',
        paymentMethodId: card.id,
      });
      await api()
        .patch(`/api/expenses/${netflix.id}`)
        .set(authHeader(user))
        .send({ startDate: '2030-01-10' })
        .expect(200);

      const body = await occurrences('2030-01-01', '2030-01-31');
      expect(body.days[0].occurrences[0].paymentMethod.name).toBe('Nubank');
    });

    it('o calendário filtra por forma de pagamento', async () => {
      const card = await nubank();
      await createExpense(ctx.app, user, {
        name: 'Netflix',
        categoryId,
        amountCents: 5590,
        startDate: '2030-01-10',
        paymentMethodId: card.id,
      });
      await createExpense(ctx.app, user, {
        name: 'Sem forma',
        categoryId,
        amountCents: 1000,
        startDate: '2030-01-12',
      });

      const body = await occurrences(
        '2030-01-01',
        '2030-01-31',
        `&paymentMethodId=${card.id}`,
      );
      expect(body.totalExpectedCents).toBe(5590);
      expect(body.days).toHaveLength(1);
    });
  });

  describe('fatura e resumo', () => {
    it('cada vencimento no cartão informa a fatura e o mês em que pesa', async () => {
      const card = await nubank();
      await createExpense(ctx.app, user, {
        name: 'Antes do fechamento',
        categoryId,
        amountCents: 1000,
        startDate: '2030-01-10',
        paymentMethodId: card.id,
      });
      await createExpense(ctx.app, user, {
        name: 'Depois do fechamento',
        categoryId,
        amountCents: 2000,
        startDate: '2030-01-28',
        paymentMethodId: card.id,
      });

      const body = await occurrences('2030-01-01', '2030-01-31');
      const [first, second] = body.days.map(
        (day: { occurrences: unknown[] }) => day.occurrences[0],
      );
      expect(first).toMatchObject({
        billingMonth: '2030-02',
        invoice: { closingDate: '2030-01-25', dueDate: '2030-02-05' },
      });
      expect(second).toMatchObject({
        billingMonth: '2030-03',
        invoice: { closingDate: '2030-02-25', dueDate: '2030-03-05' },
      });
    });

    it('o resumo do mês soma cada forma de pagamento pela fatura que vence nele', async () => {
      const card = await nubank();
      const transfer = await pix();
      const create = (body: Record<string, unknown>) =>
        createExpense(ctx.app, user, { categoryId, ...body });

      // Cobrança dia 10, antes do fechamento: a de janeiro pesa em fevereiro.
      await create({
        name: 'Netflix',
        amountCents: 5590,
        startDate: '2030-01-10',
        paymentMethodId: card.id,
      });
      // Cobrança dia 28, depois do fechamento: a de janeiro só pesa em março.
      await create({
        name: 'Academia',
        amountCents: 9990,
        startDate: '2030-01-28',
        paymentMethodId: card.id,
      });
      // Pix: pesa no próprio mês.
      await create({
        name: 'Aluguel',
        amountCents: 150000,
        startDate: '2030-01-05',
        paymentMethodId: transfer.id,
      });
      // Sem forma de pagamento: também no próprio mês.
      await create({
        name: 'Condomínio',
        amountCents: 48000,
        startDate: '2030-01-31',
      });

      const feb = await summary('2030-02');
      // Fevereiro: Netflix de janeiro (fatura de 05/02) + aluguel e condomínio de fevereiro.
      expect(feb.expectedCents).toBe(5590 + 150000 + 48000);
      expect(
        feb.byPaymentMethod.map((m: MethodSummary) => [
          m.paymentMethod?.name ?? null,
          m.expectedCents,
          m.invoice,
        ]),
      ).toEqual([
        ['C6 Pix', 150000, null],
        ['Nubank', 5590, { closingDate: '2030-01-25', dueDate: '2030-02-05' }],
        [null, 48000, null], // "sem forma" sempre por último
      ]);

      // Março: Netflix de fevereiro + Academia de janeiro na fatura de 05/03.
      const mar = await summary('2030-03');
      const nubankInMarch = mar.byPaymentMethod.find(
        (m: MethodSummary) => m.paymentMethod?.name === 'Nubank',
      );
      expect(nubankInMarch).toMatchObject({
        expectedCents: 5590 + 9990,
        invoice: { closingDate: '2030-02-25', dueDate: '2030-03-05' },
      });

      // A projeção também divide por forma de pagamento.
      const april = feb.projection.find(
        (m: { month: string }) => m.month === '2030-04',
      );
      expect(april.expectedCents).toBe(5590 + 9990 + 150000 + 48000);
      expect(
        april.byPaymentMethod.map(
          (m: {
            paymentMethod: { name: string } | null;
            expectedCents: number;
          }) => [m.paymentMethod?.name ?? null, m.expectedCents],
        ),
      ).toEqual([
        ['C6 Pix', 150000],
        ['Nubank', 5590 + 9990],
        [null, 48000],
      ]);
    });

    it('trocar de cartão move as cobranças seguintes para a fatura do cartão novo', async () => {
      const nu = await nubank();
      // Fecha dia 3 e vence dia 10 do mesmo mês.
      const picpay = await createMethod({
        name: 'PicPay',
        type: 'CREDIT_CARD',
        closingDay: 3,
        dueDay: 10,
      });
      const netflix = await createExpense(ctx.app, user, {
        name: 'Netflix',
        categoryId,
        amountCents: 5590,
        startDate: '2030-01-10',
        paymentMethodId: nu.id,
      });
      await api()
        .post(`/api/expenses/${netflix.id}/payment-methods`)
        .set(authHeader(user))
        .send({ paymentMethodId: picpay.id, effectiveFrom: '2030-02-10' })
        .expect(201);

      // Março: a Netflix de janeiro foi na fatura Nubank de 05/02 (fevereiro);
      // a de fevereiro, no PicPay, fecha 03/03 e vence 10/03.
      const mar = await summary('2030-03');
      expect(
        mar.byPaymentMethod.map((m: MethodSummary) => [
          m.paymentMethod?.name,
          m.expectedCents,
        ]),
      ).toEqual([['PicPay', 5590]]);
    });
  });
});
