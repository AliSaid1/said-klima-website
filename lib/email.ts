import { getResend } from '@/lib/resend';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  COMPANY_NAME,
  COMPANY_EMAIL_FROM,
  COMPANY_EMAIL_REPLY_TO,
  COMPANY_LOGO_EMAIL,
  COMPANY_PHONE,
  COMPANY_ADDRESS,
  COMPANY_DOMAIN,
  COMPANY_WEBSITE,
} from '@/lib/branding';

interface EmailAttachment {
  filename: string;
  content: Buffer;
}

interface SendEmailParams {
  to: string;
  templateType: string;
  variables: Record<string, string>;
  attachments?: EmailAttachment[];
}

// â”€â”€â”€ Company info helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function getCompanyInfo() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('firmeneinstellungen')
    .select('firmenname, email, telefon')
    .limit(1)
    .single();
  return {
    name: data?.firmenname || COMPANY_NAME,
    email: data?.email || COMPANY_EMAIL_FROM,
    telefon: data?.telefon || COMPANY_PHONE,
  };
}

// â”€â”€â”€ Consistent "from" and "reply-to" for all emails â”€â”€â”€â”€â”€â”€
function emailFrom(firmaName: string): string {
  return `${firmaName} <${COMPANY_EMAIL_FROM}>`;
}
const EMAIL_REPLY_TO = COMPANY_EMAIL_REPLY_TO;

// â”€â”€â”€ Status label helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function statusLabel(status: string): string {
  const map: Record<string, string> = {
    ausstehend: 'â³ Ausstehend',
    bestaetigt: 'âœ… BestÃ¤tigt',
    abgeschlossen: 'ðŸ Abgeschlossen',
    abgesagt: 'âŒ Abgesagt',
    nicht_erschienen: 'âš ï¸ Nicht erschienen',
  };
  return map[status] || status;
}

// â”€â”€â”€ Status color helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function statusColor(status: string): string {
  const map: Record<string, string> = {
    ausstehend: '#EAB308',
    bestaetigt: '#16A34A',
    abgeschlossen: '#2563EB',
    abgesagt: '#DC2626',
    nicht_erschienen: '#94A3B8',
  };
  return map[status] || '#64748B';
}

// â”€â”€â”€ Professional branded HTML email wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function emailWrapper(content: string, firma: { name: string; email: string; telefon: string }) {
  return `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
        <!-- Header with Logo -->
        <tr><td style="background:linear-gradient(135deg,#1e3a5f,#2563EB);padding:28px 40px;text-align:center;">
          <img src="${COMPANY_LOGO_EMAIL}" alt="${firma.name}" width="180" style="display:block;margin:0 auto 12px;max-width:180px;height:auto;" />
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">
            KÃ¤lte- &amp; Klimatechnik
          </p>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:40px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:28px 40px;border-top:1px solid #e2e8f0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="text-align:center;">
              <p style="margin:0 0 6px;color:#334155;font-size:14px;font-weight:700;">${firma.name}</p>
              <p style="margin:0 0 4px;color:#64748b;font-size:13px;">${COMPANY_ADDRESS}</p>
              <p style="margin:0 0 12px;color:#64748b;font-size:13px;">
                ${firma.telefon ? `Tel: ${firma.telefon} Â· ` : ''}E-Mail: <a href="mailto:${COMPANY_EMAIL_REPLY_TO}" style="color:#2563EB;text-decoration:none;">${COMPANY_EMAIL_REPLY_TO}</a>
              </p>
              <p style="margin:0 0 4px;">
                <a href="${COMPANY_WEBSITE}" style="color:#2563EB;text-decoration:none;font-size:13px;font-weight:600;">${COMPANY_DOMAIN}</a>
              </p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid #e2e8f0;padding-top:16px;">
            <tr><td style="text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.5;">
                Diese E-Mail wurde automatisch versendet. Bitte antworten Sie nicht direkt auf diese Nachricht.<br/>
                Bei Fragen erreichen Sie uns unter <a href="mailto:${COMPANY_EMAIL_REPLY_TO}" style="color:#94a3b8;">${COMPANY_EMAIL_REPLY_TO}</a>.
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send an email using a template from the `email_vorlagen` table.
 * Replaces all `{{placeholder}}` variables in subject and body.
 */
export async function sendTemplateEmail({ to, templateType, variables, attachments }: SendEmailParams) {
  const supabase = createAdminClient();

  // Fetch template
  const { data: template, error } = await supabase
    .from('email_vorlagen')
    .select('*')
    .eq('typ', templateType)
    .single();

  if (error || !template) {
    console.error(`Email template '${templateType}' not found`);
    return { success: false, error: 'Template not found' };
  }

  const firma = await getCompanyInfo();

  // Replace placeholders
  let subject = template.betreff;
  let html = template.inhalt_html;

  const allVars = {
    ...variables,
    firmenname: firma.name,
    firmen_email: firma.email,
    firmen_telefon: firma.telefon,
  };

  for (const [key, value] of Object.entries(allVars)) {
    const placeholder = `{{${key}}}`;
    subject = subject.replaceAll(placeholder, value);
    html = html.replaceAll(placeholder, value);
  }

  try {
    const { error: sendError } = await getResend().emails.send({
      from: emailFrom(firma.name),
      replyTo: EMAIL_REPLY_TO,
      to: [to],
      subject,
      html,
      ...(attachments?.length ? { attachments } : {}),
    });

    if (sendError) {
      console.error('Email send error:', sendError);
      return { success: false, error: sendError.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Email send exception:', err);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send booking confirmation email to customer
 */
export async function sendBookingConfirmation(params: {
  to: string;
  kundenname: string;
  dienstleistung: string;
  datum: string;
  uhrzeit: string;
}) {
  // Try DB template first
  const templateResult = await sendTemplateEmail({
    to: params.to,
    templateType: 'buchung_bestaetigung',
    variables: {
      kundenname: params.kundenname,
      dienstleistung: params.dienstleistung,
      datum: params.datum,
      uhrzeit: params.uhrzeit,
    },
  });

  if (templateResult.success) return templateResult;

  // Fallback: inline HTML email
  console.warn('[EMAIL] DB template not found, using inline template');
  const firma = await getCompanyInfo();

  const content = `
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">Buchung eingegangen! ðŸŽ‰</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;">Hallo ${params.kundenname}, vielen Dank fÃ¼r Ihre Buchung.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <table width="100%" cellpadding="8" cellspacing="0">
          <tr>
            <td style="color:#64748b;font-size:13px;font-weight:600;width:120px;vertical-align:top;">Service</td>
            <td style="color:#1e293b;font-size:14px;font-weight:500;">${params.dienstleistung}</td>
          </tr>
          <tr>
            <td style="color:#64748b;font-size:13px;font-weight:600;vertical-align:top;">Datum</td>
            <td style="color:#1e293b;font-size:14px;font-weight:500;">${params.datum}</td>
          </tr>
          <tr>
            <td style="color:#64748b;font-size:13px;font-weight:600;vertical-align:top;">Uhrzeit</td>
            <td style="color:#1e293b;font-size:14px;font-weight:500;">${params.uhrzeit}</td>
          </tr>
          <tr>
            <td style="color:#64748b;font-size:13px;font-weight:600;vertical-align:top;">Status</td>
            <td>
              <span style="display:inline-block;padding:4px 12px;background:#FEF3C7;color:#92400E;border-radius:20px;font-size:12px;font-weight:600;">
                â³ Ausstehend
              </span>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:0;color:#64748b;font-size:14px;">
      Wir werden Ihre Buchung in KÃ¼rze bestÃ¤tigen. Sie erhalten eine weitere E-Mail, sobald der Status aktualisiert wird.
    </p>
  `;

  try {
    const { error } = await getResend().emails.send({
      from: emailFrom(firma.name),
      replyTo: EMAIL_REPLY_TO,
      to: [params.to],
      subject: `BuchungsbestÃ¤tigung â€” ${params.dienstleistung}`,
      html: emailWrapper(content, firma),
    });

    if (error) {
      console.error('Inline email send error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('Inline email exception:', err);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send booking reminder email
 */
export async function sendBookingReminder(params: {
  to: string;
  kundenname: string;
  dienstleistung: string;
  datum: string;
  uhrzeit: string;
}) {
  return sendTemplateEmail({
    to: params.to,
    templateType: 'buchung_erinnerung',
    variables: {
      kundenname: params.kundenname,
      dienstleistung: params.dienstleistung,
      datum: params.datum,
      uhrzeit: params.uhrzeit,
    },
  });
}

/**
 * Send order confirmation email with optional PDF attachment
 */
export async function sendOrderConfirmation(params: {
  to: string;
  kundenname: string;
  bestellnummer: string;
  gesamt: string;
  pdfBuffer?: Buffer;
}) {
  const attachments: EmailAttachment[] = [];
  if (params.pdfBuffer) {
    attachments.push({
      filename: `Bestellbestaetigung_${params.bestellnummer}.pdf`,
      content: params.pdfBuffer,
    });
  }

  return sendTemplateEmail({
    to: params.to,
    templateType: 'bestellung_bestaetigung',
    variables: {
      kundenname: params.kundenname,
      bestellnummer: params.bestellnummer,
      gesamt: params.gesamt,
    },
    attachments,
  });
}

/**
 * Send "Bestellung eingegangen" email to customer immediately after checkout
 * when payment is pending (e.g. BankÃ¼berweisung / bank transfer).
 * This reassures the customer that their order was placed successfully,
 * even though payment hasn't been confirmed yet.
 * NO PDF attachment â€” that comes with the BestellbestÃ¤tigung after payment.
 */
export async function sendOrderReceivedEmail(params: {
  to: string;
  kundenname: string;
  bestellnummer: string;
  gesamt: string;
  zahlungsmethode: string;
}) {
  // Try DB template first
  const templateResult = await sendTemplateEmail({
    to: params.to,
    templateType: 'bestellung_eingegangen',
    variables: {
      kundenname: params.kundenname,
      bestellnummer: params.bestellnummer,
      gesamt: params.gesamt,
      zahlungsmethode: params.zahlungsmethode,
    },
  });

  if (templateResult.success) return templateResult;

  // Fallback: inline HTML email (in case DB template doesn't exist yet)
  console.warn('[EMAIL] DB template "bestellung_eingegangen" not found, using inline template');
  const firma = await getCompanyInfo();

  const content = `
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">ðŸ“¦ Bestellung eingegangen!</h2>
    <p style="margin:0 0 16px;color:#64748b;font-size:15px;">Hallo ${params.kundenname}, vielen Dank fÃ¼r Ihre Bestellung!</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <table width="100%" cellpadding="8" cellspacing="0">
          <tr>
            <td colspan="2" style="color:#92400E;font-size:14px;font-weight:700;padding-bottom:12px;">
              â³ Zahlung ausstehend â€” ${params.zahlungsmethode}
            </td>
          </tr>
          <tr>
            <td style="color:#78716C;font-size:13px;font-weight:600;width:140px;vertical-align:top;">Bestellnummer</td>
            <td style="color:#1e293b;font-size:14px;font-weight:700;">#${params.bestellnummer}</td>
          </tr>
          <tr>
            <td style="color:#78716C;font-size:13px;font-weight:600;vertical-align:top;">Gesamtbetrag</td>
            <td style="color:#1e293b;font-size:16px;font-weight:700;">${params.gesamt}</td>
          </tr>
          <tr>
            <td style="color:#78716C;font-size:13px;font-weight:600;vertical-align:top;">Zahlungsmethode</td>
            <td style="color:#1e293b;font-size:14px;font-weight:500;">${params.zahlungsmethode}</td>
          </tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.6;">
      Bitte Ã¼berweisen Sie den Betrag an die in der Checkout-Seite angegebene Bankverbindung.
      Sobald Ihre Zahlung eingegangen ist (in der Regel 1â€“5 Werktage), erhalten Sie automatisch
      Ihre BestellbestÃ¤tigung mit PDF per E-Mail.
    </p>

    <p style="margin:0;color:#64748b;font-size:13px;">
      Bei Fragen erreichen Sie uns jederzeit unter
      <a href="mailto:${COMPANY_EMAIL_REPLY_TO}" style="color:#2563EB;text-decoration:none;font-weight:600;">${COMPANY_EMAIL_REPLY_TO}</a>
      oder telefonisch unter <strong>${firma.telefon}</strong>.
    </p>
  `;

  try {
    const { error } = await getResend().emails.send({
      from: emailFrom(firma.name),
      replyTo: EMAIL_REPLY_TO,
      to: [params.to],
      subject: `Bestellung eingegangen â€” #${params.bestellnummer}`,
      html: emailWrapper(content, firma),
    });

    if (error) {
      console.error('[EMAIL] Order received inline email error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('[EMAIL] Order received inline email exception:', err);
    return { success: false, error: 'Failed to send order received email' };
  }
}

/**
 * Send "Zahlung fehlgeschlagen" email to customer when an async payment fails
 * (e.g. bank transfer never arrived / expired).
 */
export async function sendPaymentFailedEmail(params: {
  to: string;
  kundenname: string;
  bestellnummer: string;
  gesamt: string;
}) {
  // Try DB template first
  const templateResult = await sendTemplateEmail({
    to: params.to,
    templateType: 'zahlung_fehlgeschlagen',
    variables: {
      kundenname: params.kundenname,
      bestellnummer: params.bestellnummer,
      gesamt: params.gesamt,
    },
  });

  if (templateResult.success) return templateResult;

  // Fallback: inline HTML email
  console.warn('[EMAIL] DB template "zahlung_fehlgeschlagen" not found, using inline template');
  const firma = await getCompanyInfo();

  const content = `
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">âŒ Zahlung fehlgeschlagen</h2>
    <p style="margin:0 0 16px;color:#64748b;font-size:15px;">Hallo ${params.kundenname},</p>

    <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.6;">
      leider ist die Zahlung fÃ¼r Ihre Bestellung nicht eingegangen oder konnte nicht verarbeitet werden.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <table width="100%" cellpadding="8" cellspacing="0">
          <tr>
            <td style="color:#991B1B;font-size:13px;font-weight:600;width:140px;vertical-align:top;">Bestellnummer</td>
            <td style="color:#1e293b;font-size:14px;font-weight:700;">#${params.bestellnummer}</td>
          </tr>
          <tr>
            <td style="color:#991B1B;font-size:13px;font-weight:600;vertical-align:top;">Gesamtbetrag</td>
            <td style="color:#1e293b;font-size:16px;font-weight:700;">${params.gesamt}</td>
          </tr>
          <tr>
            <td style="color:#991B1B;font-size:13px;font-weight:600;vertical-align:top;">Status</td>
            <td style="color:#DC2626;font-size:14px;font-weight:700;">Zahlung fehlgeschlagen</td>
          </tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.6;">
      MÃ¶chten Sie es erneut versuchen? Besuchen Sie unseren Shop und legen Sie die Artikel
      erneut in den Warenkorb, oder kontaktieren Sie uns fÃ¼r UnterstÃ¼tzung.
    </p>

    <p style="margin:0;color:#64748b;font-size:13px;">
      Bei Fragen erreichen Sie uns jederzeit unter
      <a href="mailto:${COMPANY_EMAIL_REPLY_TO}" style="color:#2563EB;text-decoration:none;font-weight:600;">${COMPANY_EMAIL_REPLY_TO}</a>
      oder telefonisch unter <strong>${firma.telefon}</strong>.
    </p>
  `;

  try {
    const { error } = await getResend().emails.send({
      from: emailFrom(firma.name),
      replyTo: EMAIL_REPLY_TO,
      to: [params.to],
      subject: `Zahlung fehlgeschlagen â€” Bestellung #${params.bestellnummer}`,
      html: emailWrapper(content, firma),
    });

    if (error) {
      console.error('[EMAIL] Payment failed email error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('[EMAIL] Payment failed email exception:', err);
    return { success: false, error: 'Failed to send payment failed email' };
  }
}

/**
 * Send status update email to customer when admin changes booking status
 */
export async function sendBookingStatusEmail(params: {
  to: string;
  kundenname: string;
  dienstleistung: string;
  datum: string;
  zeit: string;
  neuerStatus: string;
}) {
  const firma = await getCompanyInfo();
  const color = statusColor(params.neuerStatus);
  const label = statusLabel(params.neuerStatus);

  let statusMessage = '';
  switch (params.neuerStatus) {
    case 'bestaetigt':
      statusMessage = 'Ihr Termin wurde bestÃ¤tigt. Wir freuen uns auf Sie!';
      break;
    case 'abgeschlossen':
      statusMessage = 'Ihr Termin wurde als abgeschlossen markiert. Vielen Dank fÃ¼r Ihr Vertrauen!';
      break;
    case 'abgesagt':
      statusMessage = 'Ihr Termin wurde leider abgesagt. Bitte kontaktieren Sie uns bei Fragen.';
      break;
    case 'nicht_erschienen':
      statusMessage = 'Unser Techniker war zum vereinbarten Zeitpunkt vor Ort, konnte Sie aber leider nicht antreffen. Bitte kontaktieren Sie uns, um einen neuen Termin zu vereinbaren.';
      break;
    default:
      statusMessage = 'Der Status Ihres Termins wurde aktualisiert.';
  }

  const content = `
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">Terminupdate</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;">Hallo ${params.kundenname}, es gibt ein Update zu Ihrem Termin.</p>

    <div style="text-align:center;margin-bottom:24px;">
      <span style="display:inline-block;padding:8px 24px;background:${color}20;color:${color};border:2px solid ${color};border-radius:30px;font-size:16px;font-weight:700;">
        ${label}
      </span>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <table width="100%" cellpadding="8" cellspacing="0">
          <tr>
            <td style="color:#64748b;font-size:13px;font-weight:600;width:120px;vertical-align:top;">Service</td>
            <td style="color:#1e293b;font-size:14px;font-weight:500;">${params.dienstleistung}</td>
          </tr>
          <tr>
            <td style="color:#64748b;font-size:13px;font-weight:600;vertical-align:top;">Datum</td>
            <td style="color:#1e293b;font-size:14px;font-weight:500;">${params.datum}</td>
          </tr>
          <tr>
            <td style="color:#64748b;font-size:13px;font-weight:600;vertical-align:top;">Uhrzeit</td>
            <td style="color:#1e293b;font-size:14px;font-weight:500;">${params.zeit}</td>
          </tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">
      ${statusMessage}
    </p>
  `;

  try {
    const { error } = await getResend().emails.send({
      from: emailFrom(firma.name),
      replyTo: EMAIL_REPLY_TO,
      to: [params.to],
      subject: `Termin ${label} â€” ${params.dienstleistung}`,
      html: emailWrapper(content, firma),
    });

    if (error) {
      console.error('[EMAIL] Status email error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('[EMAIL] Status email exception:', err);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send new booking notification to admin and technician
 */
export async function sendNewBookingNotification(params: {
  kundenname: string;
  kundenEmail: string;
  kundenTelefon: string;
  dienstleistung: string;
  datum: string;
  zeit: string;
  technikerId?: string | null;
}) {
  const firma = await getCompanyInfo();
  const supabase = createAdminClient();

  const content = `
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">ðŸ“… Neue Buchung eingegangen!</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;">Ein Kunde hat einen neuen Termin gebucht.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <table width="100%" cellpadding="8" cellspacing="0">
          <tr>
            <td style="color:#1e40af;font-size:13px;font-weight:600;width:120px;vertical-align:top;">Kunde</td>
            <td style="color:#1e293b;font-size:14px;font-weight:500;">${params.kundenname}</td>
          </tr>
          <tr>
            <td style="color:#1e40af;font-size:13px;font-weight:600;vertical-align:top;">E-Mail</td>
            <td style="color:#1e293b;font-size:14px;font-weight:500;">${params.kundenEmail}</td>
          </tr>
          ${params.kundenTelefon ? `<tr>
            <td style="color:#1e40af;font-size:13px;font-weight:600;vertical-align:top;">Telefon</td>
            <td style="color:#1e293b;font-size:14px;font-weight:500;">${params.kundenTelefon}</td>
          </tr>` : ''}
          <tr>
            <td style="color:#1e40af;font-size:13px;font-weight:600;vertical-align:top;">Service</td>
            <td style="color:#1e293b;font-size:14px;font-weight:500;">${params.dienstleistung}</td>
          </tr>
          <tr>
            <td style="color:#1e40af;font-size:13px;font-weight:600;vertical-align:top;">Datum</td>
            <td style="color:#1e293b;font-size:14px;font-weight:500;">${params.datum}</td>
          </tr>
          <tr>
            <td style="color:#1e40af;font-size:13px;font-weight:600;vertical-align:top;">Uhrzeit</td>
            <td style="color:#1e293b;font-size:14px;font-weight:500;">${params.zeit}</td>
          </tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:0;color:#64748b;font-size:14px;">
      Bitte prÃ¼fen Sie die Buchung im Admin-Dashboard und bestÃ¤tigen oder lehnen Sie den Termin ab.
    </p>
  `;

  const subject = `Neue Buchung: ${params.dienstleistung} â€” ${params.datum}`;
  const html = emailWrapper(content, firma);

  const emailPromises: Promise<{ success: boolean; error?: string }>[] = [];

  // 1. Notify admin(s)
  const { data: admins } = await supabase
    .from('benutzer')
    .select('email')
    .eq('rolle', 'admin');

  if (admins) {
    for (const a of admins) {
      if (a.email) {
        emailPromises.push(
          getResend().emails.send({
            from: emailFrom(firma.name),
            replyTo: EMAIL_REPLY_TO,
            to: [a.email],
            subject,
            html,
          }).then(({ error }) => {
            if (error) console.error('[EMAIL] Admin notify failed:', error);
            return { success: !error, error: error?.message };
          }).catch((err) => {
            console.error('[EMAIL] Admin notify exception:', err);
            return { success: false, error: 'Failed' };
          })
        );
      }
    }
  }

  // 2. Notify technician (if assigned and has email)
  if (params.technikerId) {
    const { data: tech } = await supabase
      .from('techniker')
      .select('vorname, nachname, kontakt_email')
      .eq('id', params.technikerId)
      .single();

    if (tech?.kontakt_email) {
      emailPromises.push(
        getResend().emails.send({
          from: emailFrom(firma.name),
          replyTo: EMAIL_REPLY_TO,
          to: [tech.kontakt_email],
          subject: `Neuer Termin zugewiesen: ${params.dienstleistung} â€” ${params.datum}`,
          html,
        }).then(({ error }) => {
          if (error) console.error('[EMAIL] Technician notify failed:', error);
          return { success: !error, error: error?.message };
        }).catch((err) => {
          console.error('[EMAIL] Technician notify exception:', err);
          return { success: false, error: 'Failed' };
        })
      );
    }
  }

  await Promise.allSettled(emailPromises);
  return { success: true };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// NEW ORDER â†’ ADMIN NOTIFICATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Notify company (info@ + DB admins) about a new order.
 * Called from the Stripe webhook after the customer confirmation email.
 */
export async function sendNewOrderNotification(params: {
  bestellnummer: string;
  kundenname: string;
  kundenEmail: string;
  gesamt: string;
  lieferadresse?: string;
  items?: { titel: string; artikelnummer?: string | null; menge: number; preis_brutto: number }[];
  pdfBuffer?: Buffer;
}) {
  const firma = await getCompanyInfo();
  const supabase = createAdminClient();

  const itemsHtml = params.items?.length
    ? params.items.map(i =>
        `<tr>
          <td style="color:#1e293b;font-size:14px;padding:6px 8px;border-bottom:1px solid #e2e8f0;">
            ${i.titel}${i.artikelnummer ? `<br/><span style="color:#64748b;font-size:12px;">Art.Nr: ${i.artikelnummer}</span>` : ''}
          </td>
          <td style="color:#1e293b;font-size:14px;padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:center;">${i.menge}</td>
          <td style="color:#1e293b;font-size:14px;padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;">${(i.preis_brutto * i.menge).toFixed(2)} â‚¬</td>
        </tr>`
      ).join('')
    : '';

  const content = `
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">ðŸ›’ Neue Bestellung eingegangen!</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;">Ein Kunde hat soeben eine Bestellung aufgegeben.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <table width="100%" cellpadding="8" cellspacing="0">
          <tr>
            <td style="color:#1e40af;font-size:13px;font-weight:600;width:140px;vertical-align:top;">Bestellnummer</td>
            <td style="color:#1e293b;font-size:14px;font-weight:700;">#${params.bestellnummer}</td>
          </tr>
          <tr>
            <td style="color:#1e40af;font-size:13px;font-weight:600;vertical-align:top;">Kunde</td>
            <td style="color:#1e293b;font-size:14px;font-weight:500;">${params.kundenname}</td>
          </tr>
          <tr>
            <td style="color:#1e40af;font-size:13px;font-weight:600;vertical-align:top;">E-Mail</td>
            <td style="color:#1e293b;font-size:14px;font-weight:500;">${params.kundenEmail}</td>
          </tr>
          <tr>
            <td style="color:#1e40af;font-size:13px;font-weight:600;vertical-align:top;">Gesamtbetrag</td>
            <td style="color:#1e293b;font-size:16px;font-weight:700;">${params.gesamt}</td>
          </tr>
          ${params.lieferadresse ? `<tr>
            <td style="color:#1e40af;font-size:13px;font-weight:600;vertical-align:top;">Lieferadresse</td>
            <td style="color:#1e293b;font-size:14px;font-weight:500;">${params.lieferadresse}</td>
          </tr>` : ''}
        </table>
      </td></tr>
    </table>

    ${itemsHtml ? `
    <h3 style="margin:0 0 12px;color:#1e293b;font-size:16px;">Bestellte Artikel</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin-bottom:24px;">
      <tr>
        <th style="text-align:left;padding:8px;color:#64748b;font-size:12px;font-weight:600;border-bottom:2px solid #e2e8f0;">Artikel</th>
        <th style="text-align:center;padding:8px;color:#64748b;font-size:12px;font-weight:600;border-bottom:2px solid #e2e8f0;">Menge</th>
        <th style="text-align:right;padding:8px;color:#64748b;font-size:12px;font-weight:600;border-bottom:2px solid #e2e8f0;">Summe</th>
      </tr>
      ${itemsHtml}
    </table>
    ` : ''}

    <p style="margin:0;color:#64748b;font-size:14px;">
      Bitte bearbeiten Sie die Bestellung im <strong>Admin-Dashboard</strong>.
    </p>
  `;

  const subject = `Neue Bestellung #${params.bestellnummer} â€” ${params.gesamt}`;
  const html = emailWrapper(content, firma);

  // Send to info@ (always) + any DB admin users
  const recipients: string[] = [COMPANY_EMAIL_REPLY_TO];

  const { data: admins } = await supabase
    .from('benutzer')
    .select('email')
    .eq('rolle', 'admin');

  if (admins) {
    for (const a of admins) {
      if (a.email && !recipients.includes(a.email)) {
        recipients.push(a.email);
      }
    }
  }

  // SAFETY: Exclude the customer's email to prevent them getting the admin notification
  // (edge case: customer email = admin email, e.g. business owner testing the shop)
  const customerLower = params.kundenEmail.toLowerCase();
  const adminOnly = recipients.filter(e => e.toLowerCase() !== customerLower);

  if (adminOnly.length === 0) {
    console.warn('[EMAIL] No admin recipients after excluding customer â€” skipping admin notification');
    return { success: true };
  }

  // Build PDF attachment for admin email
  const adminAttachments: { filename: string; content: Buffer }[] = [];
  if (params.pdfBuffer) {
    adminAttachments.push({
      filename: `Bestellbestaetigung_${params.bestellnummer}.pdf`,
      content: params.pdfBuffer,
    });
  }

  try {
    const { error } = await getResend().emails.send({
      from: emailFrom(firma.name),
      replyTo: EMAIL_REPLY_TO,
      to: adminOnly,
      subject,
      html,
      ...(adminAttachments.length ? { attachments: adminAttachments } : {}),
    });

    if (error) {
      console.error('[EMAIL] Order admin notification error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('[EMAIL] Order admin notification exception:', err);
    return { success: false, error: 'Failed to send admin order notification' };
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CONTACT FORM EMAILS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Send contact form emails:
 * 1. Internal notification to company (info@ + admins)
 * 2. Confirmation to the customer
 */
export async function sendContactEmails(params: {
  vorname: string;
  nachname: string;
  email: string;
  telefon?: string;
  firma?: string;
  interesse: string;
  produktName?: string;
  raeume?: string;
  flaeche?: string;
  standort?: string;
  nachricht?: string;
}) {
  const companyInfo = await getCompanyInfo();
  const fullName = `${params.vorname} ${params.nachname}`;

  // â”€â”€ 1. Internal notification to company â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const isAngebot = params.interesse.includes('Angebot') || params.interesse.includes('KlimagerÃ¤t');

  // Build detail rows dynamically â€” only show filled fields
  const detailRows: { label: string; value: string; highlight?: boolean }[] = [
    { label: 'Art der Anfrage', value: params.interesse, highlight: true },
    { label: 'Name', value: fullName },
    { label: 'E-Mail', value: params.email },
  ];
  if (params.telefon) detailRows.push({ label: 'Telefon', value: params.telefon });
  if (params.firma) detailRows.push({ label: 'Firma', value: params.firma });
  if (params.produktName) detailRows.push({ label: 'Produkt', value: params.produktName });
  if (params.raeume) detailRows.push({ label: 'RÃ¤ume', value: params.raeume });
  if (params.flaeche) detailRows.push({ label: 'FlÃ¤che', value: `${params.flaeche} mÂ²` });
  if (params.standort) detailRows.push({ label: 'Standort', value: params.standort });

  const detailRowsHtml = detailRows.map((r, i) => `
    <tr>
      <td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:500;width:130px;vertical-align:top;${i === 0 ? '' : 'border-top:1px solid #f3f4f6;'}">
        ${r.label}
      </td>
      <td style="padding:10px 16px;font-size:14px;vertical-align:top;${i === 0 ? '' : 'border-top:1px solid #f3f4f6;'}${r.highlight ? 'font-weight:700;color:#1e293b;' : 'color:#374151;'}">
        ${r.label === 'E-Mail' ? `<a href="mailto:${r.value}" style="color:#2563EB;text-decoration:none;">${r.value}</a>` : r.value}
      </td>
    </tr>
  `).join('');

  const internContent = `
    <div style="margin-bottom:8px;">
      <span style="display:inline-block;padding:4px 12px;background:${isAngebot ? '#dbeafe' : '#e0e7ff'};color:${isAngebot ? '#1d4ed8' : '#4338ca'};border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
        ${isAngebot ? 'ðŸ’° Angebotsanfrage' : 'ðŸ“© Allgemeine Anfrage'}
      </span>
    </div>
    <h2 style="margin:12px 0 4px;color:#111827;font-size:22px;font-weight:800;line-height:1.3;">Neue Anfrage von ${fullName}</h2>
    <p style="margin:0 0 28px;color:#6b7280;font-size:14px;">Eingegangen am ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:24px;">
      ${detailRowsHtml}
    </table>

    ${params.nachricht ? `
    <div style="margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#374151;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Nachricht</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;color:#374151;font-size:14px;line-height:1.7;">
        ${params.nachricht.replace(/\n/g, '<br/>')}
      </div>
    </div>
    ` : ''}

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:14px 20px;background:linear-gradient(135deg,#1e3a5f,#2563EB);border-radius:10px;text-align:center;">
          <a href="mailto:${params.email}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
            âœ‰ï¸&nbsp; Direkt antworten an ${params.vorname}
          </a>
        </td>
      </tr>
    </table>
  `;

  const internSubject = isAngebot
    ? `Angebotsanfrage von ${fullName} â€” ${params.produktName || params.interesse}`
    : `Neue Anfrage von ${fullName} â€” ${params.interesse}`;

  // â”€â”€ 2. Customer confirmation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const kundenDetailRows: { label: string; value: string }[] = [
    { label: 'Ihre Anfrage', value: params.interesse },
  ];
  if (params.produktName) kundenDetailRows.push({ label: 'Produkt', value: params.produktName });
  if (params.raeume) kundenDetailRows.push({ label: 'RÃ¤ume', value: params.raeume });
  if (params.flaeche) kundenDetailRows.push({ label: 'FlÃ¤che', value: `${params.flaeche} mÂ²` });

  const kundenDetailHtml = kundenDetailRows.map((r, i) => `
    <tr>
      <td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:500;width:120px;vertical-align:top;${i > 0 ? 'border-top:1px solid #f3f4f6;' : ''}">
        ${r.label}
      </td>
      <td style="padding:10px 16px;color:#1e293b;font-size:14px;font-weight:600;vertical-align:top;${i > 0 ? 'border-top:1px solid #f3f4f6;' : ''}">
        ${r.value}
      </td>
    </tr>
  `).join('');

  const kundenContent = `
    <h2 style="margin:0 0 6px;color:#111827;font-size:22px;font-weight:800;line-height:1.3;">Vielen Dank, ${params.vorname}!</h2>
    <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.7;">
      Wir haben Ihre Anfrage erhalten und werden uns schnellstmÃ¶glich bei Ihnen melden.
      In der Regel antworten wir innerhalb von <strong style="color:#374151;">1â€“2 Werktagen</strong>.
    </p>

    <p style="margin:0 0 10px;color:#374151;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Zusammenfassung</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:28px;">
      ${kundenDetailHtml}
    </table>

    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px 20px;margin-bottom:4px;">
      <p style="margin:0;color:#0c4a6e;font-size:14px;line-height:1.6;">
        <strong>Fragen?</strong> Erreichen Sie uns jederzeit unter
        <a href="mailto:${COMPANY_EMAIL_REPLY_TO}" style="color:#0369a1;text-decoration:none;font-weight:600;">${COMPANY_EMAIL_REPLY_TO}</a>
        oder telefonisch unter <strong>${companyInfo.telefon}</strong>.
      </p>
    </div>
  `;

  const kundenSubject = isAngebot
    ? `Ihre Angebotsanfrage â€” ${companyInfo.name}`
    : `Ihre Anfrage â€” ${companyInfo.name}`;

  // â”€â”€ Send both emails â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const results = await Promise.allSettled([
    // Internal â†’ company
    getResend().emails.send({
      from: emailFrom(companyInfo.name),
      replyTo: params.email,  // reply goes directly to the customer
      to: [COMPANY_EMAIL_REPLY_TO],
      subject: internSubject,
      html: emailWrapper(internContent, companyInfo),
    }),
    // Confirmation â†’ customer
    getResend().emails.send({
      from: emailFrom(companyInfo.name),
      replyTo: EMAIL_REPLY_TO,
      to: [params.email],
      subject: kundenSubject,
      html: emailWrapper(kundenContent, companyInfo),
    }),
  ]);

  const anyFailed = results.some(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error));
  if (anyFailed) {
    console.error('[EMAIL] Contact email(s) failed:', results);
  }
  return { success: !anyFailed };
}
