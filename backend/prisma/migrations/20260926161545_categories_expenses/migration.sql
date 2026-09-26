-- CreateEnum
CREATE TYPE "frequency" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "frequency" "frequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "installment_count" INTEGER,
    "deactivated_at" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_amounts" (
    "id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "effective_from" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_amounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_user_id_name_key" ON "categories"("user_id", "name");

-- CreateIndex
CREATE INDEX "expenses_user_id_idx" ON "expenses"("user_id");

-- CreateIndex
CREATE INDEX "expenses_category_id_idx" ON "expenses"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_amounts_expense_id_effective_from_key" ON "expense_amounts"("expense_id", "effective_from");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_amounts" ADD CONSTRAINT "expense_amounts_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Regras de integridade que o Prisma não expressa no schema (adicionadas manualmente).
-- A API já valida tudo isso nos DTOs; o banco é a última linha de defesa.

-- "Streaming" e "streaming" são a mesma categoria para o usuário.
CREATE UNIQUE INDEX "categories_user_id_lower_name_key" ON "categories"("user_id", lower("name"));
ALTER TABLE "categories" ADD CONSTRAINT "categories_color_check" CHECK ("color" ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE "expenses" ADD CONSTRAINT "expenses_interval_check" CHECK ("interval" >= 1);
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_end_date_check" CHECK ("end_date" IS NULL OR "end_date" >= "start_date");
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_installment_count_check" CHECK ("installment_count" IS NULL OR "installment_count" >= 1);
-- Gasto parcelado sempre tem a data da última parcela calculada.
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_installments_have_end_date_check" CHECK ("installment_count" IS NULL OR "end_date" IS NOT NULL);

ALTER TABLE "expense_amounts" ADD CONSTRAINT "expense_amounts_amount_cents_check" CHECK ("amount_cents" > 0);
