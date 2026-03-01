import { resend } from '@/lib/resend';
import { createAdminClient } from '@/lib/supabase/admin';

interface SendEmailParams {
  to: string;
  templateType: string;
  variables: Record<string, string>;
}

/**
 * Send an email using a template from the `email_vorlagen` table.
 * Replaces all `{{placeholder}}` variables in subject and body.
 */
export async function sendTemplateEmail({ to, templateType, variables }: SendEmailParams) {
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

  // Fetch company settings for sender info
  const { data: firma } = await supabase
    .from('firmeneinstellungen')
    .select('firmenname, email')
    .limit(1)
    .single();

  const senderName = firma?.firmenname || 'Said Kälte- und Klimatechnik';
  const senderEmail = firma?.email || 'noreply@said-klima.de';

  // Replace placeholders
  let subject = template.betreff;
  let html = template.inhalt_html;

  // Add company variables
  const allVars = {
    ...variables,
    firmenname: senderName,
    firmen_email: senderEmail,
    firmen_telefon: '', // will be filled if available
  };

  for (const [key, value] of Object.entries(allVars)) {
    const placeholder = `{{${key}}}`;
    subject = subject.replaceAll(placeholder, value);
    html = html.replaceAll(placeholder, value);
  }

  try {
    const { error: sendError } = await resend.emails.send({
      from: `${senderName} <${senderEmail}>`,
      to: [to],
      subject,
      html,
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
 * Send booking confirmation email
 */
export async function sendBookingConfirmation(params: {
  to: string;
  kundenname: string;
  dienstleistung: string;
  datum: string;
  uhrzeit: string;
}) {
  return sendTemplateEmail({
    to: params.to,
    templateType: 'buchung_bestaetigung',
    variables: {
      kundenname: params.kundenname,
      dienstleistung: params.dienstleistung,
      datum: params.datum,
      uhrzeit: params.uhrzeit,
    },
  });
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
 * Send order confirmation email
 */
export async function sendOrderConfirmation(params: {
  to: string;
  kundenname: string;
  bestellnummer: string;
  gesamt: string;
}) {
  return sendTemplateEmail({
    to: params.to,
    templateType: 'bestellung_bestaetigung',
    variables: {
      kundenname: params.kundenname,
      bestellnummer: params.bestellnummer,
      gesamt: params.gesamt,
    },
  });
}

