-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "due_date" DATE NOT NULL,
    "paid_amount_cents" INTEGER NOT NULL,
    "paid_at" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_expense_id_due_date_key" ON "payments"("expense_id", "due_date");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Regras de integridade que o Prisma não expressa no schema (adicionadas manualmente).
ALTER TABLE "payments" ADD CONSTRAINT "payments_paid_amount_cents_check" CHECK ("paid_amount_cents" > 0);
