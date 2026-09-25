import { Prisma } from '../generated/prisma/client.js';

/** Violação de unique constraint (ex.: e-mail já cadastrado). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/** Registro esperado não existe (ex.: update/delete de algo que sumiu). */
export function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}
