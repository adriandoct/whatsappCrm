import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const notifyEmail = process.env.NOTIFY_EMAIL || 'admin@agencia.com';

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface ContactInfo {
  id: string;
  phone: string;
  name?: string | null;
  ad_source?: string | null;
}

export interface LeadInfo {
  score: 'hot' | 'warm' | 'cold';
  reason: string;
}

/**
 * Sends an immediate alert email via Resend when a HOT lead is detected.
 */
export async function sendHotLeadAlert(contact: ContactInfo, lead: LeadInfo): Promise<boolean> {
  if (!resendApiKey || !resend) {
    console.warn('RESEND_API_KEY is missing. Skipping hot lead email alert.');
    return false;
  }

  try {
    const contactName = contact.name || 'Sin Nombre';
    const subject = `🔥 ALERTA HOT LEAD: ${contactName} (${contact.phone})`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0d1117; color: #e6edf3; border-radius: 8px;">
        <h2 style="color: #ef4444; margin-top: 0;">🔥 Lead de Alto Interés (HOT) Detectado</h2>
        <p>Se ha calificado un nuevo lead de alto interés a través del agente Berta en WhatsApp.</p>
        
        <div style="background-color: #161b22; padding: 15px; border-left: 4px solid #ef4444; border-radius: 4px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Nombre:</strong> ${contactName}</p>
          <p style="margin: 5px 0;"><strong>Teléfono:</strong> <a style="color: #25d366;" href="https://wa.me/${contact.phone.replace(/\D/g, '')}">${contact.phone}</a></p>
          <p style="margin: 5px 0;"><strong>Fuente de Anuncio:</strong> ${contact.ad_source || 'Directo / Desconocido'}</p>
          <p style="margin: 5px 0;"><strong>Razón de Calificación:</strong> ${lead.reason}</p>
        </div>

        <p><a href="https://whatsapp-crm-berta.vercel.app/conversations" style="display: inline-block; background-color: #25d366; color: #000; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold;">Abrir conversación en CRM</a></p>
      </div>
    `;

    await resend.emails.send({
      from: 'WhatsApp CRM Berta <onboarding@resend.dev>',
      to: [notifyEmail],
      subject,
      html: htmlContent,
    });

    console.log(`Hot lead email alert sent to ${notifyEmail} for contact ${contact.phone}`);
    return true;
  } catch (error) {
    console.error('Error sending hot lead email alert via Resend:', error);
    return false;
  }
}

/**
 * Sends a daily digest email listing all leads qualified during the day.
 */
export async function sendDailyDigestEmail(
  leads: { score: string; reason: string; qualified_at: string; contact: ContactInfo }[]
): Promise<boolean> {
  if (!resendApiKey || !resend) {
    console.warn('RESEND_API_KEY is missing. Skipping daily digest email.');
    return false;
  }

  try {
    const totalLeads = leads.length;
    const hotCount = leads.filter(l => l.score === 'hot').length;
    const warmCount = leads.filter(l => l.score === 'warm').length;
    const coldCount = leads.filter(l => l.score === 'cold').length;

    const todayDate = new Date().toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const subject = `📊 Resumen Diario de Leads CRM WhatsApp — ${todayDate}`;

    const leadRows = leads.map(l => {
      const scoreBadge = l.score === 'hot' ? '🔥 HOT' : l.score === 'warm' ? '☀️ WARM' : '❄️ COLD';
      const scoreColor = l.score === 'hot' ? '#ef4444' : l.score === 'warm' ? '#f59e0b' : '#3b82f6';
      return `
        <tr style="border-bottom: 1px solid #30363d;">
          <td style="padding: 10px;"><strong>${l.contact.name || 'Sin Nombre'}</strong><br/><small style="color:#8b949e">${l.contact.phone}</small></td>
          <td style="padding: 10px; color: ${scoreColor}; font-weight: bold;">${scoreBadge}</td>
          <td style="padding: 10px;">${l.reason}</td>
          <td style="padding: 10px;">${l.contact.ad_source || 'Directo'}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0d1117; color: #e6edf3; border-radius: 8px;">
        <h2 style="color: #25d366; margin-top: 0;">📊 Resumen Diario de Leads (${todayDate})</h2>
        <p>Total de leads procesados hoy por el agente Berta: <strong>${totalLeads}</strong></p>

        <div style="display: flex; gap: 15px; margin: 15px 0;">
          <div style="background-color: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; padding: 10px 15px; border-radius: 6px;">
            <strong style="color: #ef4444;">🔥 HOT: ${hotCount}</strong>
          </div>
          <div style="background-color: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; padding: 10px 15px; border-radius: 6px;">
            <strong style="color: #f59e0b;">☀️ WARM: ${warmCount}</strong>
          </div>
          <div style="background-color: rgba(59, 130, 246, 0.15); border: 1px solid #3b82f6; padding: 10px 15px; border-radius: 6px;">
            <strong style="color: #3b82f6;">❄️ COLD: ${coldCount}</strong>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left; background-color: #161b22; border-radius: 6px; overflow: hidden;">
          <thead>
            <tr style="background-color: #21262d; color: #8b949e;">
              <th style="padding: 10px;">Contacto</th>
              <th style="padding: 10px;">Score</th>
              <th style="padding: 10px;">Razón</th>
              <th style="padding: 10px;">Fuente</th>
            </tr>
          </thead>
          <tbody>
            ${leadRows || '<tr><td colspan="4" style="padding: 15px; text-align: center; color: #8b949e;">No se registraron nuevos leads hoy.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    await resend.emails.send({
      from: 'WhatsApp CRM Berta <onboarding@resend.dev>',
      to: [notifyEmail],
      subject,
      html: htmlContent,
    });

    console.log(`Daily digest email sent to ${notifyEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending daily digest email:', error);
    return false;
  }
}
