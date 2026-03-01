import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/availability?date=2026-03-15&dienstleistung_id=uuid
// Returns available time slots for a given date
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const dienstleistungId = searchParams.get('dienstleistung_id');

  if (!date) {
    return NextResponse.json({ error: 'Datum fehlt' }, { status: 400 });
  }

  // Check if date is blocked (globally)
  const { data: blocked } = await supabase
    .from('gesperrte_tage')
    .select('id')
    .eq('datum', date)
    .is('techniker_id', null)
    .limit(1);

  if (blocked && blocked.length > 0) {
    return NextResponse.json({ data: [], blocked: true, message: 'Dieser Tag ist gesperrt' });
  }

  // Get day of week (0=Sunday, 1=Monday, ... 6=Saturday)
  const dayOfWeek = new Date(date).getDay();

  // Get technician availability for this day
  const { data: availability } = await supabase
    .from('techniker_verfuegbarkeit')
    .select('*, techniker(id, vorname, nachname, aktiv)')
    .eq('wochentag', dayOfWeek)
    .eq('verfuegbar', true);

  if (!availability || availability.length === 0) {
    return NextResponse.json({ data: [], message: 'Keine Verfügbarkeit an diesem Tag' });
  }

  // Get existing bookings for this date
  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59`;

  const { data: existingBookings } = await supabase
    .from('buchungen')
    .select('techniker_id, geplant_von, geplant_bis')
    .gte('geplant_von', startOfDay)
    .lte('geplant_von', endOfDay)
    .in('status', ['ausstehend', 'bestaetigt']);

  // Get service duration if specified
  let durationMinutes = 60;
  if (dienstleistungId) {
    const { data: service } = await supabase
      .from('dienstleistungen')
      .select('dauer_minuten')
      .eq('id', dienstleistungId)
      .single();
    if (service) durationMinutes = service.dauer_minuten;
  }

  // Generate available slots
  const slots: Array<{ start: string; end: string; techniker_id: string; techniker_name: string }> = [];

  for (const avail of availability) {
    const tech = avail.techniker as { id: string; vorname: string; nachname: string; aktiv: boolean } | null;
    if (!tech?.aktiv) continue;

    // Check if technician is blocked on this specific date
    const { data: techBlocked } = await supabase
      .from('gesperrte_tage')
      .select('id')
      .eq('datum', date)
      .eq('techniker_id', tech.id)
      .limit(1);

    if (techBlocked && techBlocked.length > 0) continue;

    // Generate time slots (every 30 min between start and end)
    const startParts = avail.start_zeit.split(':').map(Number);
    const endParts = avail.ende_zeit.split(':').map(Number);
    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];

    for (let m = startMinutes; m + durationMinutes <= endMinutes; m += 30) {
      const slotStart = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      const slotEndMin = m + durationMinutes;
      const slotEnd = `${String(Math.floor(slotEndMin / 60)).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`;

      // Check for conflicts
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

  return NextResponse.json({ data: slots, blocked: false });
}

