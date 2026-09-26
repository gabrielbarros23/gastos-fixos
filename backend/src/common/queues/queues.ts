import type { Queue } from 'bullmq';

/** Filas da aplicação (BullMQ). Uma fila por tipo de trabalho. */
export const QUEUES = {
  /** Varredura diária que descobre quais lembretes enviar. */
  reminders: 'reminders',
  /** Envio de cada e-mail (com retry e limite de vazão próprios). */
  emails: 'emails',
  /** Tarefas de manutenção (ex.: limpar refresh tokens expirados). */
  maintenance: 'maintenance',
} as const;

/**
 * Registra (ou atualiza) um job recorrente. `upsertJobScheduler` é
 * idempotente: reiniciar a API ou subir várias instâncias não cria
 * agendamentos duplicados, porque o agendador fica no Redis, identificado
 * pelo id. (Um `@Cron` em memória rodaria uma vez em CADA instância.)
 */
export async function scheduleRecurringJob(
  queue: Queue,
  schedulerId: string,
  cron: { pattern: string; tz: string },
  jobName: string,
): Promise<void> {
  await queue.upsertJobScheduler(schedulerId, cron, { name: jobName });
}
