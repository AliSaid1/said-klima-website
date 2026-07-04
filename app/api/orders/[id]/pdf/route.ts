import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';
import { generateOrderConfirmationPdf } from '@/lib/pdf';
import type { OrderPdfData } from '@/lib/pdf';

/**
 * GET /api/orders/[id]/pdf?session_id=cs_xxx
 *
 * Generates and serves the order confirmation PDF on demand.
 * Requires a valid Stripe session_id that matches the order for security.
 * This allows the customer to download the PDF directly from the success page
 * even if the email was not delivered.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bestellungId } = await params;
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!bestellungId || !sessionId) {
    return NextResponse.json({ error: 'Fehlende Parameter' }, { status: 400 });
  }

  try {
    // â”€â”€ 1. Verify the Stripe session matches this order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent.payment_method'],
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Zahlung nicht abgeschlossen' }, { status: 402 });
    }

    if (session.metadata?.bestellung_id !== bestellungId) {
      return NextResponse.json({ error: 'Sitzung stimmt nicht mit Bestellung Ã¼berein' }, { status: 403 });
    }

    // â”€â”€ 2. Fetch order + line items from DB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const supabase = createAdminClient();

    const { data: order, error: orderErr } = await supabase
      .from('bestellungen')
      .select('bestellnummer, bestellt_am, status, zahlungsmethode, zwischensumme_brutto, steuer_summe, versand_brutto, gesamt_brutto, rechnungsadresse_json, lieferadresse_json, gast_email')
      .eq('id', bestellungId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
    }

    const { data: lineItems } = await supabase
      .from('bestellpositionen')
      .select('titel, menge, preis_brutto, einzelpreis_netto, steuersatz, artikelnummer, variante_name')
      .eq('bestellung_id', bestellungId)
      .order('erstellt_am', { ascending: true });

    // â”€â”€ 3. Extract payment method from Stripe â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const sessionAny = session as any;
    const pi = sessionAny.payment_intent;
    const card = (typeof pi === 'object' && pi?.payment_method)
      ? (pi.payment_method as any)?.card
      : null;

    // â”€â”€ 4. Build PDF data and generate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const pdfData: OrderPdfData = {
      bestellnummer: order.bestellnummer,
      bestellt_am: order.bestellt_am ?? new Date().toISOString(),
      status: order.status ?? 'bezahlt',
      zahlungsmethode: order.zahlungsmethode ?? card?.brand ?? null,
      kundenname: session.customer_details?.name ?? 'Kunde',
      kundenEmail: session.customer_details?.email ?? order.gast_email ?? null,
      rechnungsadresse: (order.rechnungsadresse_json as any) ?? null,
      lieferadresse: (order.lieferadresse_json as any) ?? null,
      positionen: (lineItems ?? []).map((item, idx) => ({
        pos: idx + 1,
        titel: item.titel,
        artikelnummer: item.artikelnummer ?? null,
        variante_name: item.variante_name ?? null,
        menge: item.menge,
        einzelpreis_netto: Number(item.einzelpreis_netto ?? 0),
        preis_brutto: Number(item.preis_brutto),
        steuersatz: Number(item.steuersatz ?? 19),
      })),
      zwischensumme_brutto: Number(order.zwischensumme_brutto ?? 0),
      steuer_summe: Number(order.steuer_summe ?? 0),
      versand_brutto: Number(order.versand_brutto ?? 0),
      gesamt_brutto: Number(order.gesamt_brutto ?? 0),
    };

    const pdfBuffer = await generateOrderConfirmationPdf(pdfData);

    // â”€â”€ 5. Return PDF as a downloadable response â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Bestellbestaetigung_${order.bestellnummer}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'private, max-age=3600', // cache for 1 hour (same session)
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    console.error('[PDF API] Error generating PDF:', message);
    return NextResponse.json({ error: 'PDF konnte nicht erstellt werden' }, { status: 500 });
  }
}


