import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendTemplateEmail } from '@/lib/email';

// ── Helper: determine if current user is admin ───────────
async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, isAdmin: false, supabase };

  const adminClient = createAdminClient();
  const { data: benutzer } = await adminClient
    .from('benutzer')
    .select('rolle')
    .eq('id', user.id)
    .single();

  return { user, isAdmin: benutzer?.rolle === 'admin', supabase };
}

// GET /api/orders/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, isAdmin, supabase } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  // Admin uses adminClient (bypasses RLS); regular user uses session client
  const db = isAdmin ? createAdminClient() : supabase;

  const { data, error } = await db
    .from('bestellungen')
    .select(`
      *,
      benutzer(vorname, nachname, email, telefonnummer),
      bestellpositionen(id, typ, titel, artikelnummer, variante_name, menge, preis_brutto, einzelpreis_netto, steuersatz)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
  }

  // For non-admin: verify they own this order
  if (!isAdmin && data.benutzer_id !== user.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 });
  }

  return NextResponse.json({ data });
}

// PUT /api/orders/[id] — Update status or add note (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, isAdmin } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: 'Nur Administratoren können Bestellungen bearbeiten' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const body = await request.json();

  // Get existing order
  const { data: existing, error: fetchError } = await adminClient
    .from('bestellungen')
    .select('notizen, status, gast_email, bestellnummer, gesamt_brutto, benutzer_id, benutzer(email, vorname, nachname)')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  const oldStatus = existing.status;

  // Update status
  if (body.status && body.status !== existing.status) {
    updates.status = body.status;
  }

  // Add note
  if (body.notiz) {
    const currentNotes = (existing.notizen as Array<Record<string, string>>) || [];
    updates.notizen = [
      ...currentNotes,
      {
        text: body.notiz.text,
        erstellt_am: new Date().toISOString(),
        autor: user.email || 'Admin',
      },
    ];
  }

  // Override notes (used for deleting individual notes)
  if (body.notizen_override !== undefined && Array.isArray(body.notizen_override)) {
    updates.notizen = body.notizen_override;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ data: existing });
  }

  const { data, error } = await adminClient
    .from('bestellungen')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[ORDERS PUT] Update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Send status-change email to customer ─────────────────
  if (updates.status && updates.status !== oldStatus) {
    const existingAny = existing as any;
    const customerEmail =
      existingAny.benutzer?.email || existing.gast_email;
    const customerName =
      existingAny.benutzer
        ? `${existingAny.benutzer.vorname} ${existingAny.benutzer.nachname}`
        : 'Kunde';

    if (customerEmail) {
      const statusLabels: Record<string, string> = {
        offen: 'Offen',
        bezahlt: 'Bezahlt',
        versandt: 'Versandt — Ihre Bestellung ist unterwegs!',
        abgeschlossen: 'Abgeschlossen',
        storniert: 'Storniert',
        erstattet: 'Erstattet',
      };

      try {
        await sendTemplateEmail({
          to: customerEmail,
          templateType: 'bestellung_status',
          variables: {
            vorname: customerName,
            kundenname: customerName,
            bestellnummer: existing.bestellnummer,
            status: statusLabels[updates.status as string] || String(updates.status),
          },
        });
        console.log(`[ORDERS] Status email sent to ${customerEmail} for #${existing.bestellnummer}: ${oldStatus} → ${updates.status}`);
      } catch (emailErr) {
        // Don't fail the request if email fails — status is already saved
        console.error('[ORDERS] Status email failed:', emailErr);
      }
    }
  }

  return NextResponse.json({ data });
}

// DELETE /api/orders/[id] — Delete an abandoned "offen" order (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { isAdmin } = await getAuthContext();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 });
  }

  const adminClient = createAdminClient();

  // Verify the order exists and is "offen" — only allow deleting unpaid orders
  const { data: order, error: fetchErr } = await adminClient
    .from('bestellungen')
    .select('id, status, bestellnummer')
    .eq('id', id)
    .single();

  if (fetchErr || !order) {
    return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
  }

  if (order.status !== 'offen') {
    return NextResponse.json(
      { error: `Nur offene Bestellungen können gelöscht werden (Status: ${order.status})` },
      { status: 400 }
    );
  }

  // Delete related records first
  await adminClient.from('bestellpositionen').delete().eq('bestellung_id', id);
  await adminClient.from('zahlungen').delete().eq('bestellung_id', id);

  // Delete the order itself
  const { error: delErr } = await adminClient.from('bestellungen').delete().eq('id', id);

  if (delErr) {
    console.error('[ORDERS] Delete failed:', delErr);
    return NextResponse.json({ error: 'Löschen fehlgeschlagen' }, { status: 500 });
  }

  console.log(`[ORDERS] Deleted abandoned order #${order.bestellnummer}`);
  return NextResponse.json({ success: true, bestellnummer: order.bestellnummer });
}
