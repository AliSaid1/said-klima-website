import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/checkout/verify?session_id=cs_xxx
// Called by the success page immediately after payment.
//
// SAFETY CONTRACT — "first-write wins":
//   1. We fetch the current DB row FIRST.
//   2. We only write a field if it is currently null/empty.
//   3. This makes the endpoint perfectly idempotent:
//      - Safe to call multiple times (customer refreshes the success page).
//      - Safe to run alongside the Stripe webhook — whichever runs first writes
//        the data; the other becomes a no-op for already-filled fields.
//   4. `status` is set based on payment_status:
//      - 'paid'   → 'bezahlt' (instant payment: card, paypal, etc.)
//      - 'unpaid' → 'warten_auf_zahlung' (delayed payment: bank transfer)
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'session_id fehlt' }, { status: 400 });
  }

  try {
    // Expand payment_intent + payment_method to get card details (brand, last4, holder)
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent.payment_method'],
    });
    const sessionAny = session as any;

    // Allow both 'paid' (instant) and 'unpaid' (bank transfer pending).
    // Only reject 'no_payment_required' or completely unknown states.
    const isPaid = session.payment_status === 'paid';
    const isPending = session.payment_status === 'unpaid';
    if (!isPaid && !isPending) {
      return NextResponse.json({ error: 'Zahlung nicht abgeschlossen' }, { status: 402 });
    }

    const bestellungId = session.metadata?.bestellung_id;
    if (!bestellungId) {
      return NextResponse.json({ error: 'Bestellungs-ID fehlt in Metadaten' }, { status: 404 });
    }

    const supabase = createAdminClient();

    // ── 1. Read current state from DB (one extra read, but ensures idempotency) ──
    const { data: current } = await supabase
      .from('bestellungen')
      .select('rechnungsadresse_json, lieferadresse_json, gast_email, stripe_payment_intent_id, bestellt_am, zahlungsmethode')
      .eq('id', bestellungId)
      .single();

    // ── 2. Extract Stripe data ────────────────────────────────────────────────
    const pi      = sessionAny.payment_intent as (Stripe.PaymentIntent & { payment_method?: Stripe.PaymentMethod }) | null;
    const pmObj   = pi?.payment_method as Stripe.PaymentMethod | undefined;
    const card    = pmObj?.card;
    const billing = pmObj?.billing_details;
    const collectedInfo = sessionAny.collected_information;

    // Resolve payment method — works for card, paypal, klarna, sepa_debit, link, bank transfer
    const resolvedPaymentMethod: string | null = (() => {
      if (!pmObj) return isPending ? 'banküberweisung' : null;
      const pmType = pmObj.type;
      if (pmType === 'customer_balance') return 'banküberweisung';
      if (pmType === 'card' && card?.brand) return card.brand;
      return pmType || null;
    })();

    // Resolve names/contact from multiple sources (API v20+ moves data around)
    const customerName  = session.customer_details?.name ?? collectedInfo?.name ?? billing?.name ?? null;
    const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;

    const buildAddr = (addrSrc: any, name?: string | null) =>
      addrSrc ? {
        name:      name ?? undefined,
        strasse:   addrSrc.line1        ?? undefined,
        zusatz:    addrSrc.line2        ?? undefined,
        plz:       addrSrc.postal_code  ?? undefined,
        ort:       addrSrc.city         ?? undefined,
        bundesland: addrSrc.state       ?? undefined,
        land:      addrSrc.country      ?? undefined,
      } : null;

    // ── Rechnungsadresse (billing) — check multiple sources (API v20+ compat)
    const rechnungsadresse = buildAddr(session.customer_details?.address, customerName)
                          ?? buildAddr(collectedInfo?.address, customerName)
                          ?? buildAddr(billing?.address, billing?.name ?? customerName);

    // ── Lieferadresse (shipping) — prefer collected_information.shipping_details (Stripe v20+)
    const shipping = collectedInfo?.shipping_details
                  ?? sessionAny.shipping_details
                  ?? sessionAny.shipping
                  ?? null;
    const lieferadresse = shipping?.address
      ? buildAddr(shipping.address, shipping.name ?? customerName)
      : rechnungsadresse;

    // ── 3. Build "fill-if-missing" update payload ─────────────────────────────
    // Status depends on payment_status: instant = bezahlt, delayed = warten_auf_zahlung
    const orderStatus = isPaid ? 'bezahlt' : 'warten_auf_zahlung';
    const updatePayload: Record<string, unknown> = { status: orderStatus };

    // Only write each field if the DB currently has nothing there.
    const isEmpty = (v: unknown) => v == null || v === '' || JSON.stringify(v) === '{}';

    if (isEmpty(current?.rechnungsadresse_json) && rechnungsadresse)
      updatePayload.rechnungsadresse_json = rechnungsadresse;

    if (isEmpty(current?.lieferadresse_json) && lieferadresse)
      updatePayload.lieferadresse_json = lieferadresse;

    if (!current?.gast_email && customerEmail)
      updatePayload.gast_email = customerEmail;

    if (!current?.stripe_payment_intent_id && pi?.id)
      updatePayload.stripe_payment_intent_id = pi.id;

    if (!current?.bestellt_am)
      updatePayload.bestellt_am = new Date().toISOString();

    if (!current?.zahlungsmethode && resolvedPaymentMethod)
      updatePayload.zahlungsmethode = resolvedPaymentMethod;

    // Save Stripe Customer ID if present
    const stripeCustomerId = typeof session.customer === 'string'
      ? session.customer
      : (session.customer as any)?.id ?? null;
    if (stripeCustomerId)
      updatePayload.stripe_customer_id = stripeCustomerId;

    // ── 4. Persist (only if there is anything new to write) ───────────────────
    if (Object.keys(updatePayload).length > 1) {   // >1 because status is always present
      await supabase.from('bestellungen').update(updatePayload).eq('id', bestellungId);
    } else {
      await supabase.from('bestellungen').update({ status: orderStatus }).eq('id', bestellungId);
    }

    // ── 5. Create zahlungen record exactly once ───────────────────────────────
    const { data: existingZahlung } = await supabase
      .from('zahlungen')
      .select('id')
      .eq('bestellung_id', bestellungId)
      .limit(1)
      .maybeSingle();

    if (!existingZahlung) {
      await supabase.from('zahlungen').insert({
        bestellung_id:            bestellungId,
        anbieter:                 'stripe',
        status:                   isPaid ? 'erfasst' : 'ausstehend',
        betrag_brutto:            (session.amount_total ?? 0) / 100,
        waehrung:                 session.currency ?? 'eur',
        stripe_payment_intent_id: pi?.id ?? null,
      });
    }

    // ── 6. Fetch the final order + line items for the success page ────────────
    const { data: order, error } = await supabase
      .from('bestellungen')
      .select('id, bestellnummer, status, gesamt_brutto, versand_brutto, lieferadresse_json, rechnungsadresse_json, gast_email, erstellt_am')
      .eq('id', bestellungId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Bestellung in Datenbank nicht gefunden' }, { status: 404 });
    }

    const { data: items } = await supabase
      .from('bestellpositionen')
      .select('*')
      .eq('bestellung_id', bestellungId);

    return NextResponse.json({
      bestellnummer:  order.bestellnummer,
      bestellung_id:  order.id,
      customer_email: customerEmail ?? order.gast_email,
      customer_name:  customerName,
      amount_total:   order.gesamt_brutto,
      shipping_total: order.versand_brutto,
      currency:       session.currency ?? 'eur',
      // Delivery address (Lieferadresse)
      address:         lieferadresse ?? (order.lieferadresse_json as any),
      // Billing address (Rechnungsadresse)
      billing_address: rechnungsadresse ?? (order.rechnungsadresse_json as any),
      // Payment details — supports card, paypal, klarna, sepa, link, bank transfer, etc.
      payment_method: resolvedPaymentMethod ?? 'card',
      card_last4:     card?.last4 ?? null,
      card_brand:     card?.brand ?? null,
      card_exp_month: card?.exp_month ?? null,
      card_exp_year:  card?.exp_year  ?? null,
      billing_name:   billing?.name ?? customerName,
      status:         order.status,
      items:          items || [],
      date:           order.erstellt_am,
      // Bank transfer: payment is pending until the transfer arrives (1-5 business days)
      payment_pending: isPending,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    console.error('Checkout verify error:', message);
    return NextResponse.json({ error: 'Sitzung konnte nicht verifiziert werden' }, { status: 500 });
  }
}


