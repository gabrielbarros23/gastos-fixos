import { api } from './client';

/** Dispara agora a varredura de lembretes do usuário (a API só permite fora de produção). */
export async function runReminders(): Promise<{ queued: number }> {
  const { data } = await api.post<{ queued: number }>('/reminders/run');
  return data;
}
