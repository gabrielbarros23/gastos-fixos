-- AlterTable
ALTER TABLE "payment_methods" ADD COLUMN     "last_digits" TEXT;

-- Regras de integridade adicionadas manualmente.
-- Exatamente 4 dígitos, e só em cartões (crédito ou débito).
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_last_digits_check" CHECK (
  "last_digits" IS NULL
  OR ("last_digits" ~ '^[0-9]{4}$' AND "type" IN ('CREDIT_CARD', 'DEBIT_CARD'))
);
