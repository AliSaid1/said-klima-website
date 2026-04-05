import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { sanitizeText } from '@/lib/sanitize';
import { sendContactEmails } from '@/lib/email';

// POST /api/contact — Handle contact form / Anfrage submissions
export async function POST(request: NextRequest) {
  // ── Rate limit: 5 submissions per 10 minutes per IP ─────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = await rateLimit(`contact:${ip}`, 5, 600);

  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  // ── Parse + validate body ───────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }

  const vorname  = sanitizeText(String(body.vorname  ?? ''), 100).trim();
  const nachname = sanitizeText(String(body.nachname ?? ''), 100).trim();
  const email    = sanitizeText(String(body.email    ?? ''), 254).trim().toLowerCase();

  if (!vorname || !nachname || !email) {
    return NextResponse.json(
      { error: 'Bitte füllen Sie alle Pflichtfelder aus (Vorname, Nachname, E-Mail).' },
      { status: 400 },
    );
  }

  // Simple email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Ungültige E-Mail-Adresse.' }, { status: 400 });
  }

  const telefon     = sanitizeText(String(body.telefon     ?? ''), 30);
  const firma       = sanitizeText(String(body.firma       ?? ''), 200);
  const interesse   = sanitizeText(String(body.interesse   ?? 'Allgemeine Anfrage'), 200);
  const produktName = sanitizeText(String(body.produktName ?? ''), 300);
  const raeume      = sanitizeText(String(body.raeume      ?? ''), 100);
  const flaeche     = sanitizeText(String(body.flaeche     ?? ''), 20);
  const standort    = sanitizeText(String(body.standort    ?? ''), 200);
  const nachricht   = sanitizeText(String(body.nachricht   ?? ''), 5000);

  // ── Send emails ─────────────────────────────────────────
  try {
    const result = await sendContactEmails({
      vorname,
      nachname,
      email,
      telefon:     telefon     || undefined,
      firma:       firma       || undefined,
      interesse,
      produktName: produktName || undefined,
      raeume:      raeume      || undefined,
      flaeche:     flaeche     || undefined,
      standort:    standort    || undefined,
      nachricht:   nachricht   || undefined,
    });

    if (!result.success) {
      console.error('[CONTACT] Email sending failed');
      return NextResponse.json(
        { error: 'Beim Senden ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, message: 'Anfrage erfolgreich gesendet.' });
  } catch (err) {
    console.error('[CONTACT] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Ein unerwarteter Fehler ist aufgetreten.' },
      { status: 500 },
    );
  }
}

