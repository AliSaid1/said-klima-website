import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-guard';
import { apiServerError } from '@/lib/api-response';

// POST /api/technicians/seed-availability — admin only
// M-3: Added admin guard — previously this endpoint had NO authentication at all.
// Creates default availability (Mo-Fr 08:00–17:00) for all active technicians
// that don't have any availability entries yet.
export async function POST() {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const supabase = createAdminClient();

  // Get all active technicians
  const { data: technicians, error: techError } = await supabase
    .from('techniker')
    .select('id, vorname, nachname')
    .eq('aktiv', true);

  if (techError) return apiServerError(techError.message);

  if (!technicians || technicians.length === 0) {
    return NextResponse.json({ message: 'Keine aktiven Techniker gefunden', seeded: 0 });
  }

  let seededCount = 0;

  for (const tech of technicians) {
    // Check if technician already has availability entries
    const { data: existing } = await supabase
      .from('techniker_verfuegbarkeit')
      .select('id')
      .eq('techniker_id', tech.id)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`[SEED] ${tech.vorname} ${tech.nachname} already has availability, skipping`);
      continue;
    }

    // Create default availability Mo-Fr 08:00-17:00
    const defaultAvailability = [1, 2, 3, 4, 5].map((wochentag) => ({
      techniker_id: tech.id,
      wochentag,
      start_zeit: '08:00',
      ende_zeit: '17:00',
      verfuegbar: true,
    }));

    const { error: insertError } = await supabase
      .from('techniker_verfuegbarkeit')
      .insert(defaultAvailability);

    if (insertError) {
      console.error(`[SEED] Error for ${tech.vorname} ${tech.nachname}:`, insertError.message);
    } else {
      console.log(`[SEED] Created availability for ${tech.vorname} ${tech.nachname}`);
      seededCount++;
    }
  }

  return NextResponse.json({
    message: `Verfügbarkeit für ${seededCount} Techniker erstellt`,
    seeded: seededCount,
    total: technicians.length,
  });
}
