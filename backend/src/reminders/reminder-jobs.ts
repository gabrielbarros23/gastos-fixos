import type { CalendarDate } from '../domain/calendar-date.js';

export const REMINDER_JOBS = {
  scanAll: 'scan-due-occurrences',
  send: 'send-reminder',
} as const;

export interface SendReminderJobData {
  userId: string;
  expenseId: string;
  dueDate: CalendarDate;
}

/**
 * Id determinístico do job de envio: adicionar o mesmo lembrete duas vezes no
 * mesmo dia (ex.: varredura das 8h + botão "enviar agora") vira um job só.
 * O dia da varredura entra no id para que, se um envio falhar de vez hoje,
 * a varredura de amanhã consiga tentar de novo com um job novo.
 * (BullMQ não aceita ":" em ids customizados.)
 */
export function sendReminderJobId(
  data: SendReminderJobData,
  scanDate: CalendarDate,
): string {
  return `reminder_${data.expenseId}_${data.dueDate}_${scanDate}`;
}
