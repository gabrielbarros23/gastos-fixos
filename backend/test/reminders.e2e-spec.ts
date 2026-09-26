import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { RefreshTokensService } from '../src/auth/refresh-tokens.service.js';
import {
  addDays,
  todayIn,
  type CalendarDate,
} from '../src/domain/calendar-date.js';
import { ReminderSenderService } from '../src/reminders/reminder-sender.service.js';
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

/**
 * Teste de ponta a ponta de verdade: API → Redis (BullMQ) → worker → SMTP →
 * Mailpit. Os e-mails enviados são lidos pela API HTTP do Mailpit.
 */
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025';

interface MailSummary {
  ID: string;
  Subject: string;
}

async function mailsTo(email: string): Promise<MailSummary[]> {
  const query = encodeURIComponent(`to:"${email}"`);
  const response = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`);
  return ((await response.json()) as { messages: MailSummary[] }).messages;
}

/** Espera o worker processar a fila e o e-mail chegar ao Mailpit. */
async function waitForMails(email: string, count: number, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const mails = await mailsTo(email);
    if (mails.length >= count) return mails;
    if (Date.now() > deadline) {
      throw new Error(
        `Esperava ${count} e-mail(s) para ${email}, chegaram ${mails.length}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

async function mailHtml(id: string): Promise<string> {
  const response = await fetch(`${MAILPIT_URL}/api/v1/message/${id}`);
  return ((await response.json()) as { HTML: string }).HTML;
}

/** Remove do Mailpit os e-mails do teste (a caixa é a mesma do desenvolvimento). */
async function deleteMailsTo(email: string): Promise<void> {
  const query = encodeURIComponent(`to:"${email}"`);
  await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`, {
    method: 'DELETE',
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Lembretes por e-mail (e2e)', () => {
  let ctx: TestContext;
  let user: RegisteredUser;
  let categoryId: string;
  let today: CalendarDate;

  const api = () => request(ctx.app.getHttpServer());
  const runReminders = (owner = user) =>
    api().post('/api/reminders/run').set(authHeader(owner)).expect(202);

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    // E-mail único por teste: nenhum teste enxerga e-mails de outro.
    user = await registerUser(ctx.app, {
      email: `lembrete-${randomUUID()}@test.com`,
    });
    categoryId = (await categoryIdsByName(ctx.app, user))['Streaming'];
    today = todayIn('America/Sao_Paulo');
  });

  afterEach(async () => {
    await deleteMailsTo(user.email);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('envia o lembrete do vencimento de amanhã (padrão: 1 dia antes)', async () => {
    const tomorrow = addDays(today, 1);
    const netflix = await createExpense(ctx.app, user, {
      name: 'Netflix',
      categoryId,
      amountCents: 5590,
      startDate: tomorrow,
    });

    const res = await runReminders();
    expect(res.body).toEqual({ queued: 1 });

    const [mail] = await waitForMails(user.email, 1);
    expect(mail.Subject).toBe('Netflix vence amanhã · R$ 55,90');
    const html = await mailHtml(mail.ID);
    expect(html).toContain('R$ 55,90');
    expect(html).toContain(tomorrow.split('-').reverse().join('/'));

    const log = await ctx.prisma.reminderLog.findFirstOrThrow({
      where: { expenseId: netflix.id },
    });
    expect(log.status).toBe('SENT');
    expect(log.sentAt).toBeInstanceOf(Date);
  });

  it('não duplica: varreduras repetidas geram um e-mail só', async () => {
    await createExpense(ctx.app, user, {
      name: 'Spotify',
      categoryId,
      amountCents: 2190,
      startDate: addDays(today, 1),
    });

    // Duas seguidas, antes do worker processar: o jobId determinístico deduplica.
    await runReminders();
    await runReminders();
    await waitForMails(user.email, 1);

    // Depois de enviado, a tabela de lembretes impede um novo envio.
    const again = await runReminders();
    expect(again.body).toEqual({ queued: 0 });

    await sleep(1500);
    expect(await mailsTo(user.email)).toHaveLength(1);
  });

  it('respeita a antecedência configurada pelo usuário', async () => {
    await api()
      .patch('/api/users/me')
      .set(authHeader(user))
      .send({ reminderDaysBefore: 3 })
      .expect(200);
    await createExpense(ctx.app, user, {
      name: 'Dentro da janela',
      categoryId,
      amountCents: 1000,
      startDate: addDays(today, 3),
    });
    await createExpense(ctx.app, user, {
      name: 'Fora da janela',
      categoryId,
      amountCents: 1000,
      startDate: addDays(today, 4),
    });

    const res = await runReminders();
    expect(res.body).toEqual({ queued: 1 });

    const [mail] = await waitForMails(user.email, 1);
    expect(mail.Subject).toBe('Dentro da janela vence em 3 dias · R$ 10,00');
  });

  it('não lembra de vencimento já pago', async () => {
    const tomorrow = addDays(today, 1);
    const rent = await createExpense(ctx.app, user, {
      name: 'Aluguel',
      categoryId,
      amountCents: 150000,
      startDate: tomorrow,
    });
    await api()
      .put(`/api/expenses/${rent.id}/occurrences/${tomorrow}/payment`)
      .set(authHeader(user))
      .expect(200);

    const res = await runReminders();
    expect(res.body).toEqual({ queued: 0 });
  });

  it('não envia nada com os lembretes desligados', async () => {
    await createExpense(ctx.app, user, {
      name: 'Academia',
      categoryId,
      amountCents: 9990,
      startDate: addDays(today, 1),
    });
    await api()
      .patch('/api/users/me')
      .set(authHeader(user))
      .send({ remindersEnabled: false })
      .expect(200);

    const res = await runReminders();
    expect(res.body).toEqual({ queued: 0 });
  });

  it('revalida na hora do envio: se pagou depois da varredura, o e-mail não sai', async () => {
    const tomorrow = addDays(today, 1);
    const gym = await createExpense(ctx.app, user, {
      name: 'Academia',
      categoryId,
      amountCents: 9990,
      startDate: tomorrow,
    });
    await api()
      .put(`/api/expenses/${gym.id}/occurrences/${tomorrow}/payment`)
      .set(authHeader(user))
      .expect(200);

    // Simula o job que já estava na fila antes do pagamento
    const sender = ctx.app.get(ReminderSenderService);
    await expect(
      sender.send({ userId: user.id, expenseId: gym.id, dueDate: tomorrow }),
    ).resolves.toBe('skipped');
    expect(await ctx.prisma.reminderLog.count()).toBe(0);
  });

  it('escapa o nome do gasto no HTML do e-mail', async () => {
    await createExpense(ctx.app, user, {
      name: '<img src=x onerror=alert(1)>',
      categoryId,
      amountCents: 1000,
      startDate: addDays(today, 1),
    });

    await runReminders();
    const [mail] = await waitForMails(user.email, 1);
    const html = await mailHtml(mail.ID);

    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('um usuário só dispara os próprios lembretes', async () => {
    await createExpense(ctx.app, user, {
      name: 'Netflix',
      categoryId,
      amountCents: 5590,
      startDate: addDays(today, 1),
    });
    const other = await registerUser(ctx.app, {
      email: `outro-${randomUUID()}@test.com`,
    });

    const res = await runReminders(other);
    expect(res.body).toEqual({ queued: 0 });
  });

  it('a limpeza de manutenção remove só refresh tokens expirados', async () => {
    await ctx.prisma.refreshToken.create({
      data: {
        userId: user.id,
        familyId: randomUUID(),
        tokenHash: `expirado-${randomUUID()}`,
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const deleted = await ctx.app.get(RefreshTokensService).deleteExpired();

    expect(deleted).toBe(1);
    // O token da sessão atual (válido) continua
    expect(
      await ctx.prisma.refreshToken.count({ where: { userId: user.id } }),
    ).toBe(1);
  });
});
