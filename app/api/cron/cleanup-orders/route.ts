import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/cron/cleanup-orders — Daily cron job (3 AM)
 *
 * Deletes abandoned orders with status "offen" that are older than 3 days.
 *
 * Why 3 days?
 * - Stripe Checkout sessions expire after 24 hours.
 * - If a customer started checkout but didn't pay, the session is dead.
 * - 3 days gives a generous buffer for edge cases (bank transfers, etc.).
 * - Guest orders with status "offen" have no customer email or personal info,
 *   so they cannot be followed up on and are just DB noise.
 *
 * The bestellpositionen FK (bestellung_id) should cascade-delete.
 * If not, we delete them explicitly first.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Calculate cutoff: 3 days ago
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 3);
  const cutoffISO = cutoff.toISOString();

  try {
    // Find all abandoned orders: status "offen" and older than 3 days
    const { data: abandonedOrders, error: fetchErr } = await supabase
      .from('bestellungen')
      .select('id, bestellnummer, erstellt_am')
      .eq('status', 'offen')
      .lt('erstellt_am', cutoffISO);

    if (fetchErr) {
      console.error('[CRON] Failed to fetch abandoned orders:', fetchErr);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!abandonedOrders || abandonedOrders.length === 0) {
      console.log('[CRON] No abandoned orders to clean up');
      return NextResponse.json({ deleted: 0, message: 'No abandoned orders found' });
    }

    const ids = abandonedOrders.map((o) => o.id);

    // Delete bestellpositionen first (in case FK is not CASCADE)
    const { error: posErr } = await supabase
      .from('bestellpositionen')
      .delete()
      .in('bestellung_id', ids);

    if (posErr) {
      console.error('[CRON] Failed to delete bestellpositionen:', posErr);
    }

    // Delete zahlungen if any exist for these orders
    await supabase
      .from('zahlungen')
      .delete()
      .in('bestellung_id', ids);

    // Delete the orders themselves
    const { error: delErr } = await supabase
      .from('bestellungen')
      .delete()
      .in('id', ids);

    if (delErr) {
      console.error('[CRON] Failed to delete abandoned orders:', delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    console.log(`[CRON] Cleaned up ${ids.length} abandoned orders: ${abandonedOrders.map(o => o.bestellnummer).join(', ')}`);

    return NextResponse.json({
      deleted: ids.length,
      orders: abandonedOrders.map((o) => o.bestellnummer),
    });
  } catch (err) {
    console.error('[CRON] Cleanup error:', err);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}

