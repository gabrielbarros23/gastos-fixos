/**
 * Dados de demonstração: `npm run db:seed`.
 *
 * Cria (ou recria do zero) o usuário demo com gastos variados, com datas
 * relativas ao ano atual para o calendário sempre ter o que mostrar.
 *
 *   e-mail: demo@gastos.dev
 *   senha:  demo12345
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { DEFAULT_CATEGORIES } from '../src/categories/default-categories.js';
import {
  addDays,
  addMonthsClamped,
  fromParts,
  toDbDate,
  todayIn,
  toParts,
  type CalendarDate,
} from '../src/domain/calendar-date.js';
import {
  projectOccurrences,
  type ExpenseSchedule,
} from '../src/domain/projection.js';
import {
  endDateForInstallments,
  type Frequency,
} from '../src/domain/recurrence.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const DEMO_EMAIL = 'demo@gastos.dev';
const DEMO_PASSWORD = 'demo12345';

type CategoryName = (typeof DEFAULT_CATEGORIES)[number]['name'];

const PAYMENT_METHODS = [
  // Fecha dia 25 e vence dia 5: cobranças depois do dia 25 só pesam dois meses depois.
  {
    name: 'Nubank',
    type: 'CREDIT_CARD',
    color: '#8A05BE',
    closingDay: 25,
    dueDay: 5,
    lastDigits: '4821',
  },
  // Fecha dia 3 e vence dia 10 do mesmo mês.
  {
    name: 'PicPay',
    type: 'CREDIT_CARD',
    color: '#11C76F',
    closingDay: 3,
    dueDay: 10,
    lastDigits: '0937',
  },
  { name: 'C6 Pix automático', type: 'PIX', color: '#0EA5E9' },
  { name: 'Débito automático Itaú', type: 'ACCOUNT_DEBIT', color: '#EC7000' },
] as const;

type PaymentMethodName = (typeof PAYMENT_METHODS)[number]['name'];

interface SeedExpense {
  name: string;
  description?: string;
  category: CategoryName;
  frequency: Frequency;
  interval?: number;
  startDate: CalendarDate;
  installments?: number;
  deactivatedAt?: CalendarDate;
  /** Primeiro valor + mudanças de preço, em centavos. */
  amounts: { amountCents: number; effectiveFrom: CalendarDate }[];
  /** Histórico da forma de pagamento (vazio = sem forma de pagamento). */
  paymentMethods: { method: PaymentMethodName; effectiveFrom: CalendarDate }[];
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function buildExpenses(today: CalendarDate): SeedExpense[] {
  const { year, month } = toParts(today);
  const date = (m: number, d: number) => fromParts({ year, month: m, day: d });
  // Celular comprado há 3 meses, em 12x no dia 20
  const phoneStart = addMonthsClamped(fromParts({ year, month, day: 20 }), -3);

  return [
    {
      name: 'Aluguel',
      category: 'Moradia',
      frequency: 'MONTHLY',
      startDate: date(1, 5),
      amounts: [{ amountCents: 150000, effectiveFrom: date(1, 5) }],
      paymentMethods: [
        { method: 'C6 Pix automático', effectiveFrom: date(1, 5) },
      ],
    },
    {
      name: 'Condomínio',
      description: 'Vence no último dia do mês',
      category: 'Moradia',
      frequency: 'MONTHLY',
      startDate: date(1, 31), // cai em 28/02 (ou 29/02) e volta ao dia 31
      amounts: [{ amountCents: 48000, effectiveFrom: date(1, 31) }],
      paymentMethods: [], // boleto avulso: fica em "sem forma de pagamento"
    },
    {
      name: 'Netflix',
      description: 'Plano padrão',
      category: 'Streaming',
      frequency: 'MONTHLY',
      startDate: date(1, 10),
      amounts: [
        { amountCents: 4490, effectiveFrom: date(1, 10) },
        { amountCents: 5990, effectiveFrom: date(6, 15) }, // aumento no meio do ano
      ],
      paymentMethods: [
        { method: 'Nubank', effectiveFrom: date(1, 10) },
        { method: 'PicPay', effectiveFrom: date(6, 10) }, // trocou de cartão em junho
      ],
    },
    {
      name: 'Spotify',
      category: 'Streaming',
      frequency: 'MONTHLY',
      startDate: date(1, 22),
      amounts: [{ amountCents: 2190, effectiveFrom: date(1, 22) }],
      paymentMethods: [{ method: 'Nubank', effectiveFrom: date(1, 22) }],
    },
    {
      name: 'Academia',
      category: 'Saúde',
      frequency: 'MONTHLY',
      startDate: date(2, 15),
      amounts: [{ amountCents: 9990, effectiveFrom: date(2, 15) }],
      paymentMethods: [{ method: 'PicPay', effectiveFrom: date(2, 15) }],
    },
    {
      name: 'Plano de saúde',
      category: 'Saúde',
      frequency: 'MONTHLY',
      startDate: date(1, 12),
      amounts: [{ amountCents: 42000, effectiveFrom: date(1, 12) }],
      paymentMethods: [
        { method: 'Débito automático Itaú', effectiveFrom: date(1, 12) },
      ],
    },
    {
      name: 'Celular',
      description: 'Parcelado em 12x',
      category: 'Outros',
      frequency: 'MONTHLY',
      startDate: phoneStart,
      installments: 12,
      amounts: [{ amountCents: 25000, effectiveFrom: phoneStart }],
      paymentMethods: [{ method: 'Nubank', effectiveFrom: phoneStart }],
    },
    {
      name: 'IPVA',
      category: 'Transporte',
      frequency: 'YEARLY',
      startDate: date(3, 20),
      amounts: [{ amountCents: 180000, effectiveFrom: date(3, 20) }],
      paymentMethods: [
        { method: 'C6 Pix automático', effectiveFrom: date(3, 20) },
      ],
    },
    {
      name: 'Seguro do carro',
      category: 'Transporte',
      frequency: 'MONTHLY',
      interval: 6, // semestral
      startDate: date(4, 10),
      amounts: [{ amountCents: 110000, effectiveFrom: date(4, 10) }],
      paymentMethods: [{ method: 'PicPay', effectiveFrom: date(4, 10) }],
    },
    {
      name: 'Diarista',
      category: 'Moradia',
      frequency: 'WEEKLY',
      interval: 2, // quinzenal
      startDate: date(1, 7),
      amounts: [{ amountCents: 18000, effectiveFrom: date(1, 7) }],
      paymentMethods: [
        { method: 'C6 Pix automático', effectiveFrom: date(1, 7) },
      ],
    },
    {
      name: 'Curso de inglês',
      description: 'Cancelado em julho',
      category: 'Outros',
      frequency: 'MONTHLY',
      startDate: date(1, 8),
      deactivatedAt: date(7, 1),
      amounts: [{ amountCents: 35000, effectiveFrom: date(1, 8) }],
      paymentMethods: [{ method: 'Nubank', effectiveFrom: date(1, 8) }],
    },
  ];
}

/**
 * Vencimentos já passados ficam pagos no próprio dia, com duas exceções para a
 * demo ter o que mostrar: a última mensalidade da academia fica em atraso, e a
 * Netflix de dois meses atrás foi paga com um valor diferente do previsto.
 */
function buildPayments(
  name: string,
  schedule: ExpenseSchedule,
  today: CalendarDate,
) {
  const yesterday = addDays(today, -1);
  const past = projectOccurrences(schedule, schedule.startDate, yesterday);
  const lastTwoMonths = addMonthsClamped(today, -2);

  return past
    .filter((_, i) => !(name === 'Academia' && i === past.length - 1))
    .map((o) => ({
      dueDate: toDbDate(o.dueDate),
      paidAt: toDbDate(o.dueDate),
      paidAmountCents:
        name === 'Netflix' && o.dueDate.startsWith(lastTwoMonths.slice(0, 7))
          ? o.expectedAmountCents + 350 // pagou com multa
          : o.expectedAmountCents,
    }));
}

async function main(): Promise<void> {
  const today = todayIn(process.env.APP_TIMEZONE ?? 'America/Sao_Paulo');

  // Recria do zero (a exclusão do usuário apaga tudo em cascata).
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: {
      name: 'Usuário Demo',
      email: DEMO_EMAIL,
      passwordHash: await hash(DEMO_PASSWORD, 12),
      categories: { create: [...DEFAULT_CATEGORIES] },
      paymentMethods: { create: [...PAYMENT_METHODS] },
    },
    include: { categories: true, paymentMethods: true },
  });
  const categoryId = (name: CategoryName) =>
    user.categories.find((category) => category.name === name)!.id;
  const paymentMethodId = (name: PaymentMethodName) =>
    user.paymentMethods.find((method) => method.name === name)!.id;

  for (const expense of buildExpenses(today)) {
    const interval = expense.interval ?? 1;
    const endDate = expense.installments
      ? endDateForInstallments(
          {
            frequency: expense.frequency,
            interval,
            startDate: expense.startDate,
          },
          expense.installments,
        )
      : null;

    const schedule = {
      ...expense,
      interval,
      endDate,
      installmentCount: expense.installments ?? null,
    };

    await prisma.expense.create({
      data: {
        userId: user.id,
        categoryId: categoryId(expense.category),
        name: expense.name,
        description: expense.description ?? null,
        frequency: expense.frequency,
        interval,
        startDate: toDbDate(expense.startDate),
        endDate: endDate ? toDbDate(endDate) : null,
        installmentCount: schedule.installmentCount,
        deactivatedAt: expense.deactivatedAt
          ? toDbDate(expense.deactivatedAt)
          : null,
        amounts: {
          create: expense.amounts.map((amount) => ({
            amountCents: amount.amountCents,
            effectiveFrom: toDbDate(amount.effectiveFrom),
          })),
        },
        paymentMethods: {
          create: expense.paymentMethods.map(({ method, effectiveFrom }) => ({
            paymentMethodId: paymentMethodId(method),
            effectiveFrom: toDbDate(effectiveFrom),
          })),
        },
        payments: { create: buildPayments(expense.name, schedule, today) },
      },
    });
  }

  console.log(`Seed concluído: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
