-- CreateEnum
CREATE TYPE "reminder_status" AS ENUM ('PENDING', 'SENT');

-- CreateTable
CREATE TABLE "reminder_logs" (
    "id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "due_date" DATE NOT NULL,
    "status" "reminder_status" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reminder_logs_expense_id_due_date_key" ON "reminder_logs"("expense_id", "due_date");

-- AddForeignKey
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
