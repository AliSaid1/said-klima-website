/**
 * Availability API routes for booking availability (Verfügbarkeit).
 *
 * Computes public appointment slots from Supabase tables for technician
 * schedules, blocked booking dates (gesperrte_tage), existing bookings
 * (buchungen), and service (Dienstleistung) durations.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Converts minutes after midnight to a zero-padded 24-hour time string.
 *
 * @param m - Minute offset after midnight.
 * @returns A time string in `HH:MM` format.
 */
// Helper: minutes → "HH:MM"
function mToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/**
 * GET /api/availability
 *
 * Public endpoint that returns available booking slots for one date. Reads
 * query params `date` (required, ISO date), `total_duration` (optional total
 * service duration in minutes), and legacy `dienstleistung_id` (service ID).
 *
 * Uses the Supabase admin client to read `gesperrte_tage` (blocked booking
 * dates), `techniker_verfuegbarkeit` (technician availability), `techniker`,
 * `buchungen` (bookings), and optionally `dienstleistungen` (services).
 *
 * Returns `200` with `{ data, blocked, durationMinutes? }`; `data` contains
 * slot objects with start/end times and technician identity. Returns `400`
 * when `date` is missing and `500` when the availability query fails.
 *
 * Side effects: none; this route only reads Supabase data.
 *
 * @param request - The incoming NextRequest containing availability query parameters.
 * @returns A NextResponse with available slots, blocked-day information, or an error.
 */
// GET /api/availability?date=2026-03-15&total_duration=120
// OR  /api/availability?date=2026-03-15&dienstleistung_id=uuid  (legacy)
// Returns available time slots for a given date.
// total_duration = sum of all selected services' durations in minutes.
export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const totalDurationParam = searchParams.get('total_duration');
  const dienstleistungId = searchParams.get('dienstleistung_id');

  if (!date) {
    return NextResponse.json({ error: 'Datum fehlt' }, { status: 400 });
  }

  // ── 1. Blocked day? ──
  const { data: blocked } = await supabase
    .from('gesperrte_tage')
    .select('id')
    .eq('datum', date)
    .is('techniker_id', null)
    .limit(1);

  if (blocked && blocked.length > 0) {
    return NextResponse.json({ data: [], blocked: true, message: 'Dieser Tag ist gesperrt' });
  }

  // ── 2. Day of week ──
  const dayOfWeek = new Date(date).getUTCDay();

  // ── 3. Active technician availability ──
  const { data: availability, error: availError } = await supabase
    .from('techniker_verfuegbarkeit')
    .select('*, techniker!inner(id, vorname, nachname, aktiv)')
    .eq('wochentag', dayOfWeek)
    .eq('verfuegbar', true)
    .eq('techniker.aktiv', true);

  if (availError) {
    return NextResponse.json({ error: availError.message }, { status: 500 });
  }

  if (!availability || availability.length === 0) {
    return NextResponse.json({ data: [], message: 'Keine Verfügbarkeit an diesem Tag' });
  }

  // ── 4. Existing bookings ──
  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59`;

  const { data: existingBookings } = await supabase
    .from('buchungen')
    .select('techniker_id, geplant_von, geplant_bis')
    .gte('geplant_von', startOfDay)
    .lte('geplant_von', endOfDay)
    .in('status', ['ausstehend', 'bestaetigt']);

  // ── 5. Determine total duration ──
  // Minimum 60 minutes so slots always look clean (e.g. 08:00–09:00)
  let durationMinutes = 60; // fallback
  if (totalDurationParam) {
    durationMinutes = Math.max(60, parseInt(totalDurationParam, 10) || 60);
  } else if (dienstleistungId) {
    // Legacy: single service id — still enforce 60 min minimum
    const { data: service } = await supabase
      .from('dienstleistungen')
      .select('dauer_minuten')
      .eq('id', dienstleistungId)
      .single();
    if (service) durationMinutes = Math.max(60, service.dauer_minuten);
  }

  // ── 6. Generate slots ──
  const slots: Array<{ start: string; end: string; techniker_id: string; techniker_name: string }> = [];
  // Step in 30-min increments so users have more choice, but each slot
  // spans the full combined service duration.
  const stepMinutes = 30;

  for (const avail of availability) {
    const tech = avail.techniker as { id: string; vorname: string; nachname: string; aktiv: boolean } | null;
    if (!tech?.aktiv) continue;

    // Technician blocked on this specific date?
    const { data: techBlocked } = await supabase
      .from('gesperrte_tage')
      .select('id')
      .eq('datum', date)
      .eq('techniker_id', tech.id)
      .limit(1);
    if (techBlocked && techBlocked.length > 0) continue;

    const startParts = avail.start_zeit.split(':').map(Number);
    const endParts = avail.ende_zeit.split(':').map(Number);
    const wStart = startParts[0] * 60 + startParts[1];
    const wEnd = endParts[0] * 60 + endParts[1];

    for (let m = wStart; m + durationMinutes <= wEnd; m += stepMinutes) {
      const slotStart = mToTime(m);
      const slotEnd = mToTime(m + durationMinutes);

      // Conflict check: does this technician have an overlapping booking?
      const slotStartISO = `${date}T${slotStart}:00`;
      const slotEndISO = `${date}T${slotEnd}:00`;
      const hasConflict = (existingBookings || []).some((b) => {
        if (b.techniker_id !== tech.id) return false;
        return b.geplant_von < slotEndISO && b.geplant_bis > slotStartISO;
      });

      if (!hasConflict) {
        slots.push({
          start: slotStart,
          end: slotEnd,
          techniker_id: tech.id,
          techniker_name: `${tech.vorname} ${tech.nachname}`,
        });
      }
    }
  }

  return NextResponse.json({ data: slots, blocked: false, durationMinutes });
}
