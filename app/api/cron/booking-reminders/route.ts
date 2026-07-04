/**
 * Booking reminder cron API route. It scans buchungen (bookings) scheduled for
 * the next day, joins benutzer (user) and dienstleistungen (service) details,
 * sends reminder emails, and marks successful reminders as sent.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendBookingReminder } from '@/lib/email';

/**
 * Sends one-day-ahead booking reminder emails.
 * GET /api/cron/booking-reminders.
 *
 * Auth: cron-secret protected via `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Request shape: no body or query parameters are read; only the authorization
 * header is validated.
 *
 * Response: `200` with `{ success, sent, failed, total }`; `401` when the cron
 * secret is missing or invalid; `500` when fetching buchungen fails.
 *
 * Side effects: sends Resend booking reminder emails via `sendBookingReminder`
 * and updates `buchungen.erinnerung_gesendet` to `true` for successful sends.
 * Intended schedule: daily, before the next day's appointments.
 *
 * @param request - The incoming NextRequest containing the cron authorization header.
 * @returns A NextResponse summarizing reminder delivery counts.
 */
// GET /api/cron/booking-reminders — Daily cron job
// Sends reminders for bookings happening tomorrow
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Get tomorrow's date range
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startOfDay = new Date(tomorrow);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(tomorrow);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch bookings for tomorrow that haven't been reminded
  const { data: bookings, error } = await supabase
    .from('buchungen')
    .select(`
      id,
      geplant_von,
      erinnerung_gesendet,
      benutzer(vorname, nachname, email),
      dienstleistungen(name)
    `)
    .gte('geplant_von', startOfDay.toISOString())
    .lte('geplant_von', endOfDay.toISOString())
    .in('status', ['ausstehend', 'bestaetigt'])
    .eq('erinnerung_gesendet', false);

  if (error) {
    console.error('Cron error fetching bookings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const booking of bookings || []) {
    const benutzer = (booking.benutzer as unknown as { vorname: string; nachname: string; email: string }[] | null)?.[0];
    const dienstleistung = (booking.dienstleistungen as unknown as { name: string }[] | null)?.[0];

    if (!benutzer?.email) continue;

    const geplantVon = new Date(booking.geplant_von);
    const result = await sendBookingReminder({
      to: benutzer.email,
      kundenname: `${benutzer.vorname} ${benutzer.nachname}`,
      dienstleistung: dienstleistung?.name || 'Termin',
      datum: geplantVon.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      uhrzeit: geplantVon.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    });

    if (result.success) {
      // Mark as reminded
      await supabase
        .from('buchungen')
        .update({ erinnerung_gesendet: true })
        .eq('id', booking.id);
      sent++;
    } else {
      failed++;
    }
  }

  console.log(`Cron: ${sent} reminders sent, ${failed} failed, ${bookings?.length || 0} total`);

  return NextResponse.json({
    success: true,
    sent,
    failed,
    total: bookings?.length || 0,
  });
}
