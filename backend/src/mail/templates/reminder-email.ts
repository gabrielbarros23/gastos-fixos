import {
  escapeHtml,
  formatCalendarDate,
  formatCents,
} from '../../common/format.js';
import type { CalendarDate } from '../../domain/calendar-date.js';
import type { MailMessage } from '../mail.service.js';

export interface ReminderEmailData {
  to: string;
  userName: string;
  expenseName: string;
  categoryName: string;
  amountCents: number;
  dueDate: CalendarDate;
  /** Dias até o vencimento (0 = hoje). */
  daysUntil: number;
  installment: { number: number; total: number } | null;
  /** Link para o calendário no mês do vencimento. */
  calendarUrl: string;
}

export function whenLabel(daysUntil: number): string {
  if (daysUntil <= 0) return 'vence hoje';
  if (daysUntil === 1) return 'vence amanhã';
  return `vence em ${daysUntil} dias`;
}

/** Monta o lembrete em HTML simples (estilos inline, que é o que os clientes de e-mail aceitam) e em texto puro. */
export function renderReminderEmail(data: ReminderEmailData): MailMessage {
  const when = whenLabel(data.daysUntil);
  const amount = formatCents(data.amountCents);
  const dueDate = formatCalendarDate(data.dueDate);
  const installment = data.installment
    ? `${data.installment.number}/${data.installment.total}`
    : null;

  const rows: [string, string][] = [
    ['Valor previsto', amount],
    ['Vencimento', dueDate],
    ['Categoria', data.categoryName],
    ...(installment ? [['Parcela', installment] as [string, string]] : []),
  ];

  const e = escapeHtml;
  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f5f6fa;font-family:Arial,Helvetica,sans-serif;color:#141824;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e3e6ee;border-radius:12px;">
      <tr>
        <td style="padding:28px;">
          <p style="margin:0 0 6px;font-size:14px;color:#5b6275;">Olá, ${e(data.userName)}!</p>
          <h1 style="margin:0 0 20px;font-size:20px;line-height:1.3;">${e(data.expenseName)} ${e(when)}</h1>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;">
            ${rows
              .map(
                ([label, value]) => `<tr>
              <td style="padding:8px 0;color:#5b6275;border-bottom:1px solid #f0f2f7;">${e(label)}</td>
              <td style="padding:8px 0;text-align:right;font-weight:bold;border-bottom:1px solid #f0f2f7;">${e(value)}</td>
            </tr>`,
              )
              .join('')}
          </table>
          <p style="margin:24px 0 0;">
            <a href="${e(data.calendarUrl)}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">Ver no calendário</a>
          </p>
          <p style="margin:24px 0 0;font-size:12px;color:#8a91a3;">Você recebe este e-mail porque ativou os lembretes. Para mudar a antecedência ou desativar, acesse Ajustes no app.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Olá, ${data.userName}!`,
    '',
    `${data.expenseName} ${when}.`,
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Ver no calendário: ${data.calendarUrl}`,
  ].join('\n');

  return {
    to: data.to,
    subject: `${data.expenseName} ${when} · ${amount}`,
    html,
    text,
  };
}
