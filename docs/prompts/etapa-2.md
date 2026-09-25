# Contexto para a Etapa 2 — Controle de Gastos Fixos

> Este arquivo existe para que uma sessão nova do Claude (sem o histórico da conversa
> original) consiga continuar o projeto só com o repositório. Leia inteiro antes de começar.

## Quem sou e como quero trabalhar

Sou o Gabriel, desenvolvedor buscando a primeira vaga **backend Node.js**. Este é um projeto de
portfólio: o backend precisa ter qualidade profissional (modelagem, regras de negócio bem
testadas, código organizado); o frontend é importante, mas secundário.

- Construímos em **etapas**. Ao final de cada uma, **pare e espere minha revisão**.
- Quando tomar uma decisão técnica relevante, explique o motivo em poucas linhas: quero
  conseguir defender cada decisão numa entrevista.
- Se algo estiver ambíguo, **pergunte antes de assumir**.
- Commits pequenos, **Conventional Commits em inglês**, cada commit compilando sozinho.
  Push para `origin main` ao final da etapa (repo privado: github.com/gabrielbarros23/gastos-fixos).
- Código e commits em inglês; interface, e-mails, README e mensagens de erro da API em português.

## O produto

O usuário cadastra manualmente seus gastos fixos (Netflix, aluguel, academia, parcela do celular)
e a aplicação mostra esses gastos num **calendário**, com total previsto por dia, por mês e para os
próximos meses, e envia **lembretes por e-mail** antes de cada vencimento.

### Etapas
1. ✅ docker-compose, setup do NestJS, Prisma, autenticação — **concluída**
2. ⏭️ **categorias, gastos fixos, histórico de valor e a lógica de recorrência com testes** ← você está aqui
3. ocorrências (consulta por período), projeção, pagamentos e resumo
4. lembretes com BullMQ + envio de e-mail (Nodemailer/Mailpit); job de limpeza de refresh tokens expirados
5. frontend (React + Vite + TS + styled-components, React Router, TanStack Query, React Hook Form + Zod; calendário e gráfico feitos à mão)
6. README, revisão geral e ajustes

## Stack e estado atual do repositório

- Monorepo: `backend/` (e `frontend/` na etapa 5). `docker-compose.yml` na raiz com Postgres 17,
  Redis 7 e Mailpit.
- **NestJS 12 em ESM** (`"type": "module"`): imports relativos terminam em `.js`.
- **Prisma 7.10** com `@prisma/adapter-pg`; client gerado em `backend/src/generated/prisma`
  (gitignored; `npm install` roda `prisma generate`). Importe de `../generated/prisma/client.js`.
  Não atualize para o Prisma 8 (ainda é RC).
- **Vitest** (não Jest — decisão tomada): unitários em `src/**/*.spec.ts` (`npm test`), e2e em
  `test/**/*.e2e-spec.ts` (`npm run test:e2e`) contra o banco real `gastos_test`.
- TypeScript 6 (não use TS 7: o tooling não suporta). Lint: oxlint. Formatação: Prettier.
- Postgres do Docker na porta **5433** do host (a 5432 pode estar ocupada por um Postgres local).

Já existe (leia antes de codar para seguir os mesmos padrões):
- `src/config/env.validation.ts` — env vars validadas no boot com class-validator.
- `src/common/http/all-exceptions.filter.ts` — formato único de erro
  `{ statusCode, error, message, details?, path, timestamp }`; `validation.pipe.ts` com
  `whitelist` + `forbidNonWhitelisted` e erros `{ field, message }`.
- `src/common/auth/` — `JwtAuthGuard` global (rotas protegidas por padrão), `@Public()`, `@CurrentUser()`.
- `src/auth/`, `src/users/` — cadastro, login, refresh token opaco com rotação e detecção de reuso,
  `GET/PATCH /api/users/me`.
- `src/common/validation/` — `@Trim()`, `@NormalizeEmail()`, `@MaxBytes()`.
- Padrões: DTOs de resposta com `static from(entity)` e mapeamento explícito (ver
  `users/dto/user-response.dto.ts`); mensagens de validação em português; erros de unique do Prisma
  convertidos em 409 nos services (`prisma/prisma-errors.ts`).
- Schema: tabelas/colunas em snake_case via `@@map`/`@map`, IDs `uuid(7)`, instantes em
  `@db.Timestamptz(3)`. **CHECK constraints** são adicionadas à mão no SQL da migration
  (`prisma migrate dev --name x --create-only`, editar, depois `prisma migrate dev`).
- e2e: `test/utils/test-app.ts` (`createTestApp`, `resetDatabase`, `registerUser`).

## Decisões de design já aprovadas (não rediscutir)

1. **Ocorrências são calculadas sob demanda, nunca armazenadas.** O gasto guarda a *regra*; só o que
   *acontece* com uma ocorrência é persistido (pagamento na etapa 3, lembrete enviado na etapa 4),
   sempre pela chave natural `(expenseId, dueDate)`.
2. **Dinheiro em centavos (`Int`)**, nunca float. Moeda BRL.
3. **Datas de vencimento são datas de calendário**: `@db.Date` no banco, `"YYYY-MM-DD"` na API.
   Toda a aritmética usa **apenas funções UTC** num módulo próprio, sem biblioteca de datas
   (`new Date('2026-10-05')` é meia-noite UTC = 21h do dia 04 em São Paulo — o clássico bug do
   "dia anterior"). O fuso `America/Sao_Paulo` só entra para responder "que dia é hoje?" (via
   `Intl.DateTimeFormat`). Adicione `APP_TIMEZONE` (default `America/Sao_Paulo`) ao `Env`.
4. **Recorrência calculada sempre a partir da âncora** (`startDate`), nunca a partir da ocorrência
   anterior: a n-ésima ocorrência mensal é `startDate + n × interval meses`, com o dia limitado ao
   último dia do mês. Assim 31/01 → 28/02 (29/02 em ano bissexto) → **31/03**. Anual no 29/02 cai
   em 28/02 nos anos não bissextos. Semanal = `startDate + n × interval × 7 dias`.
5. **Histórico de valor por vigência**: o valor de uma ocorrência é o `ExpenseAmount` com o maior
   `effectiveFrom <= dueDate`. Mudar o preço é INSERT, nunca UPDATE. Invariante: o primeiro
   registro tem `effectiveFrom = startDate`.
6. **Desativar = cancelar a partir de hoje**: `deactivatedAt` (date, `null` = ativo). Ocorrências com
   vencimento **antes** de `deactivatedAt` continuam existindo; as de `deactivatedAt` em diante somem.
   Reativar limpa o campo. Excluir (`DELETE`) apaga tudo, inclusive histórico (para gasto criado
   por engano). A API expõe `isActive` calculado.
7. **Categoria é obrigatória.** No cadastro do usuário, criar 5 categorias padrão **na mesma
   transação**: Moradia, Streaming, Saúde, Transporte, Outros (com cores). Excluir categoria com
   gastos → **409**.
8. **Isolamento**: toda query filtra por `userId`; recurso de outro usuário → **404** (não 403).
9. **Sem camada de repository**: services usam o PrismaService; a lógica testável fica pura em
   `src/domain/`.

## Escopo da Etapa 2

### Schema (nova migration)

```prisma
enum Frequency {
  WEEKLY   // a cada `interval` semanas
  MONTHLY  // a cada `interval` meses (3 = trimestral, 6 = semestral)
  YEARLY   // a cada `interval` anos
}

model Category {
  id, userId, name, color ("#RRGGBB"), createdAt, updatedAt
  @@unique([userId, name])       // onDelete Cascade a partir do User
}

model Expense {
  id, userId, categoryId, name, description?,
  frequency Frequency, interval Int @default(1),
  startDate @db.Date,            // 1º vencimento; define o dia âncora
  endDate? @db.Date,             // último vencimento possível (inclusivo)
  installmentCount Int?,         // se informado, endDate é calculada
  deactivatedAt? @db.Date,       // null = ativo
  createdAt, updatedAt
  // category: onDelete Restrict; user: onDelete Cascade; @@index([userId])
}

model ExpenseAmount {
  id, expenseId, amountCents Int, effectiveFrom @db.Date, createdAt
  @@unique([expenseId, effectiveFrom])   // expense: onDelete Cascade
}
```

CHECK constraints na migration: `amount_cents > 0`, `interval >= 1`,
`end_date >= start_date`, `installment_count >= 1`, `color ~ '^#[0-9A-Fa-f]{6}$'`.

### Domínio puro (`src/domain/`, sem Nest e sem Prisma)

- `calendar-date.ts` — parse/format `YYYY-MM-DD`, `isLeapYear`, `daysInMonth`, `addDays`,
  `addMonthsClamped`, comparação, `todayIn(timeZone)`.
- `recurrence.ts` — `nthOccurrence(rule, n)`, `occurrencesBetween(rule, from, to)` (pular direto para
  o primeiro n relevante, sem iterar desde o início), `isOccurrenceDate(rule, date)`,
  `endDateForInstallments(rule, count)`, `installmentNumber(rule, date)`, `nextOccurrence(rule, from)`.
  A regra considera `startDate`, `endDate` e `deactivatedAt`.
- `amount-history.ts` — `amountAt(history, date)`.
- Uma função que combina regra + histórico e devolve as ocorrências de um período com o valor
  previsto de cada uma (a mescla com pagamentos fica para a etapa 3).

**Testes unitários obrigatórios** (Vitest): dia 31 em meses de 30 dias e em fevereiro, com volta ao
31; 29/02 anual em ano bissexto e não bissexto; dia 30 em fevereiro; semanal e quinzenal; a cada 3
e 6 meses; data de fim (inclusiva) e parcelamento (12x → endDate correta, número da parcela);
`deactivatedAt` cortando ocorrências; intervalo de consulta começando no meio da série; **mudança de
valor no meio do período** (ocorrências antes e depois de `effectiveFrom`); virada de ano.

### Endpoints (prefixo `/api`, todos autenticados, documentados no Swagger)

| Método | Rota | O que faz |
|---|---|---|
| GET / POST | `/categories` | Lista (com contagem de gastos) e cria `{ name, color }` |
| PATCH / DELETE | `/categories/:id` | Edita; exclui (**409** se houver gastos). Nome duplicado → 409 |
| GET | `/expenses?status=active\|inactive\|all&categoryId=` | Lista com **valor atual** e **próximo vencimento** |
| GET | `/expenses/:id` | Detalhe + histórico de valores |
| POST | `/expenses` | Cria com `amountCents` inicial; aceita `endDate` **ou** `installments`, não ambos |
| PATCH | `/expenses/:id` | Edita dados e regra (**não** o valor). Recalcula `endDate` se parcelado; mantém a invariante do 1º `ExpenseAmount` |
| POST | `/expenses/:id/deactivate` e `/activate` | Desativa (a partir de hoje em SP) / reativa |
| DELETE | `/expenses/:id` | Exclui definitivamente (cascata) |
| GET / POST | `/expenses/:id/amounts` | Histórico / novo valor `{ amountCents, effectiveFrom }` (mesma data → 409) |
| DELETE | `/expenses/:id/amounts/:amountId` | Remove uma mudança de valor (o valor inicial não pode ser removido) |

Validações: `amountCents` inteiro entre 1 e 100.000.000 (R$ 1 milhão); `interval` 1–24;
`installments` 1–360; datas no formato `YYYY-MM-DD` válidas (crie um validador próprio);
`categoryId` de outro usuário → 404.

### Testes e2e

CRUD de categorias (incluindo 409 de nome duplicado e de exclusão em uso), categorias padrão criadas
no cadastro, criação de gasto parcelado (endDate calculada), mudança de valor, desativar/reativar,
próximo vencimento na listagem e **isolamento entre usuários** (usuário B recebe 404 nos recursos de A).

### Extra da etapa

`prisma/seed.ts` com um usuário demo (`demo@gastos.dev` / senha documentada) e gastos variados:
aluguel no dia 5, Netflix com aumento de preço no meio do ano, academia, celular em 12x, IPVA anual,
seguro semestral e algo no dia 31. Configure em `prisma.config.ts` (`migrations.seed`, com `tsx`).

## Como rodar

```bash
docker compose up -d                 # na raiz (no Windows, abra o Docker Desktop antes)
cd backend
cp .env.example .env                 # e gere um JWT_ACCESS_SECRET
npm install
npm run db:migrate
npm run start:dev                    # http://localhost:3000/api/docs
npm test && npm run test:e2e
```

## Ao terminar

Rode lint, testes unitários e e2e, faça os commits, dê push e me apresente um resumo: o que foi
feito, decisões novas (curtas, para entrevista), desvios deste plano e o que devo revisar primeiro.
Depois **pare** e espere minha aprovação para a Etapa 3.
