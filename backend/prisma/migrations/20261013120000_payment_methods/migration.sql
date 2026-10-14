-- CreateEnum
CREATE TYPE "payment_method_type" AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'BOLETO', 'ACCOUNT_DEBIT', 'OTHER');

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "payment_method_type" NOT NULL,
    "color" TEXT NOT NULL,
    "closing_day" INTEGER,
    "due_day" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_payment_methods" (
    "id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "payment_method_id" UUID,
    "effective_from" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_user_id_name_key" ON "payment_methods"("user_id", "name");

-- CreateIndex
CREATE INDEX "expense_payment_methods_payment_method_id_idx" ON "expense_payment_methods"("payment_method_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_payment_methods_expense_id_effective_from_key" ON "expense_payment_methods"("expense_id", "effective_from");

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payment_methods" ADD CONSTRAINT "expense_payment_methods_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payment_methods" ADD CONSTRAINT "expense_payment_methods_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Regras de integridade que o Prisma não expressa no schema (adicionadas manualmente).

-- "Nubank" e "nubank" são a mesma forma de pagamento para o usuário.
CREATE UNIQUE INDEX "payment_methods_user_id_lower_name_key" ON "payment_methods"("user_id", lower("name"));
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_color_check" CHECK ("color" ~ '^#[0-9A-Fa-f]{6}$');
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_closing_day_check" CHECK ("closing_day" BETWEEN 1 AND 31);
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_due_day_check" CHECK ("due_day" BETWEEN 1 AND 31);
-- Cartão de crédito sempre tem fechamento e vencimento da fatura; as outras formas nunca têm.
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_card_cycle_check" CHECK (
  ("type" = 'CREDIT_CARD' AND "closing_day" IS NOT NULL AND "due_day" IS NOT NULL)
  OR ("type" <> 'CREDIT_CARD' AND "closing_day" IS NULL AND "due_day" IS NULL)
);
