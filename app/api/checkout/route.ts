import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiServerError } from '@/lib/api-response';
import { sanitizeText } from '@/lib/sanitize';

interface CartItem {
  artikel_id: string;
  variant_id?: string;   // variant name string â€” used to look up preis_aufschlag in DB
  menge: number;
}

// POST /api/checkout â€” Create Stripe Checkout Session
// H-4: Idempotency key added so duplicate requests don't create duplicate sessions.
// H-5: Prices are fetched server-side from the DB â€” client-supplied prices are IGNORED.
export async function POST(request: NextRequest) {
  // Body size guard
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 16_384) {
    return NextResponse.json({ error: 'Anfrage zu groÃŸ' }, { status: 413 });
  }

  const supabase    = await createClient();
  const adminClient = createAdminClient();
  const body        = await request.json();

  const { items, kunden_email } = body as {
    items: CartItem[];
    kunden_email?: string;
  };

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Warenkorb ist leer' }, { status: 400 });
  }
  if (items.length > 50) {
    return NextResponse.json({ error: 'Zu viele Artikel im Warenkorb' }, { status: 400 });
  }

  // Validate each artikel_id is a UUID to prevent injection
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!items.every((i) => typeof i.artikel_id === 'string' && uuidRe.test(i.artikel_id))) {
    return NextResponse.json({ error: 'UngÃ¼ltige Artikel-IDs' }, { status: 400 });
  }
  if (!items.every((i) => Number.isInteger(i.menge) && i.menge >= 1 && i.menge <= 999)) {
    return NextResponse.json({ error: 'UngÃ¼ltige Mengenangaben' }, { status: 400 });
  }

  // â”€â”€ H-5: Fetch prices from DB â€” never trust client-supplied prices â”€â”€â”€â”€â”€â”€â”€
  const articleIds = items.map((i) => i.artikel_id);
  const { data: dbArtikels, error: artikelErr } = await adminClient
    .from('artikel')
    .select('id, titel, artikelnummer, preis_brutto, rabattpreis, aktiv, varianten, artikel_bilder(anzeige_reihenfolge, medien_dateien(speicherpfad))')
    .in('id', articleIds);

  if (artikelErr) return apiServerError(artikelErr.message);

  // Verify all requested articles exist and are active
  const artikelMap = new Map((dbArtikels || []).map((a: any) => [a.id, a]));
  for (const item of items) {
    const art = artikelMap.get(item.artikel_id);
    if (!art) return NextResponse.json({ error: `Artikel ${item.artikel_id} nicht gefunden` }, { status: 400 });
    if (!art.aktiv) return NextResponse.json({ error: `Artikel "${art.titel}" ist nicht verfÃ¼gbar` }, { status: 400 });
  }
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // Build verified line items using DB prices + variant surcharges
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const verifiedItems = items.map((item) => {
    const art = artikelMap.get(item.artikel_id)!;
    // Base price: use rabattpreis if it's a real discount, else preis_brutto
    let preis: number = (art.rabattpreis != null && art.rabattpreis < art.preis_brutto)
      ? Number(art.rabattpreis)
      : Number(art.preis_brutto);

    // Apply variant surcharge from DB JSONB â€” client cannot manipulate this
    if (item.variant_id) {
      const varianten: Array<{ name: string; preis_aufschlag: number }> =
        Array.isArray(art.varianten) ? art.varianten : [];
      const variant = varianten.find((v) => v.name === item.variant_id);
      if (variant) {
        // Variant price = base preis_brutto + surcharge (discounts don't apply to variants)
        preis = Number(art.preis_brutto) + Number(variant.preis_aufschlag);
      }
    }

    const titel = item.variant_id
      ? sanitizeText(`${art.titel} â€“ ${item.variant_id}`, 500)
      : sanitizeText(art.titel, 500);

    // Resolve first product image for Stripe Checkout display
    const bilder = Array.isArray(art.artikel_bilder) ? art.artikel_bilder : [];
    const sorted = bilder.sort((a: any, b: any) => (a.anzeige_reihenfolge ?? 0) - (b.anzeige_reihenfolge ?? 0));
    const firstPath = sorted[0]?.medien_dateien?.speicherpfad;
    let imageUrl: string | undefined;
    if (firstPath) {
      imageUrl = firstPath.startsWith('http')
        ? firstPath
        : `${supabaseUrl}/storage/v1/object/public/product-images/${firstPath}`;
    }

    return {
      artikel_id:    item.artikel_id,
      variant_id:    item.variant_id,
      artikelnummer: art.artikelnummer || null,
      titel,
      preis_brutto:  preis,
      menge:         item.menge,
      imageUrl,
    };
  });

  const bestellnummer  = `BS-${Date.now().toString(36).toUpperCase()}`;
  const zwischensumme  = verifiedItems.reduce((s, i) => s + i.preis_brutto * i.menge, 0);
  // Prices are GROSS (incl. 19% VAT) â€” extract VAT using gross Ã— (19/119)
  const steuer         = Math.round(zwischensumme * (19 / 119) * 100) / 100;

  // Fetch shipping settings from DB â€” admin-configurable via /admin/settings
  const { data: shippingSettings } = await adminClient
    .from('firmeneinstellungen')
    .select('versandkosten, versandkostenlos_ab')
    .limit(1)
    .single();
  const versandSatz   = Number(shippingSettings?.versandkosten       ?? 5);
  const versandGratis = Number(shippingSettings?.versandkostenlos_ab ?? 500);

  // Free shipping for orders â‰¥ versandkostenlos_ab, else flat versandSatz
  const versand = zwischensumme >= versandGratis ? 0 : versandSatz;
  const gesamt  = zwischensumme + versand;

  // Get optional authenticated user (user client for auth only)
  const { data: { user } } = await supabase.auth.getUser();

  // â”€â”€ Create or reuse a Stripe Customer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ALWAYS create a customer â€” even for guests without email.
  // Stripe requires a Customer object for BankÃ¼berweisung (bank transfer).
  // Stripe docs: "Enabling bank transfers on the checkout page requires
  // specifying the customer in the checkout session."
  const customerEmail = kunden_email || user?.email || undefined;
  let stripeCustomerId: string | undefined;

  try {
    // 1) For logged-in users: reuse stripe_customer_id saved on their profile
    if (user) {
      const { data: benutzerRow } = await adminClient
        .from('benutzer')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();
      if (benutzerRow?.stripe_customer_id) {
        stripeCustomerId = benutzerRow.stripe_customer_id;
      }
    }

    // 2) If not found on user, search Stripe by email (avoids duplicates)
    if (!stripeCustomerId && customerEmail) {
      const existing = await getStripe().customers.list({ email: customerEmail, limit: 1 });
      if (existing.data.length > 0) {
        stripeCustomerId = existing.data[0].id;
      }
    }

    // 3) Create a new Stripe Customer if none found â€” even without email (for guests).
    //    Stripe Checkout will collect the email during the session and attach it.
    if (!stripeCustomerId) {
      const stripeCustomer = await getStripe().customers.create({
        ...(customerEmail ? { email: customerEmail } : {}),
        ...(user?.user_metadata?.full_name ? { name: user.user_metadata.full_name as string } : {}),
        metadata: { ...(user ? { benutzer_id: user.id } : {}) },
      });
      stripeCustomerId = stripeCustomer.id;
    }
  } catch (custErr) {
    // Non-fatal: if customer creation fails, session will use customer_email fallback
    console.error('[Checkout] Failed to create/find Stripe Customer:', custErr);
  }
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // â”€â”€ All DB writes use adminClient (service_role) â€” bypasses RLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // The checkout route is server-only. RLS write policies on bestellungen /
  // bestellpositionen were removed by migration 012; service_role is the
  // correct and only path for server-side inserts into these tables.
  const { data: bestellung, error: bestellError } = await adminClient
    .from('bestellungen')
    .insert({
      bestellnummer,
      status:               'offen',
      zwischensumme_brutto: zwischensumme,
      steuer_summe:         steuer,
      versand_brutto:       versand,
      gesamt_brutto:        gesamt,
      rechnungsadresse_json: {},
      notizen:              [],
      ...(user  ? { benutzer_id: user.id }        : {}),
      ...(kunden_email ? { gast_email: kunden_email } : {}),
    })
    .select()
    .single();

  if (bestellError) return apiServerError(bestellError.message);

  // einzelpreis_netto is NOT NULL â€” calculate from preis_brutto / (1 + steuersatz)
  await adminClient.from('bestellpositionen').insert(
    verifiedItems.map((item) => ({
      bestellung_id:     bestellung.id,
      artikel_id:        item.artikel_id,
      typ:               'artikel',
      titel:             item.titel,
      menge:             item.menge,
      preis_brutto:      item.preis_brutto,
      einzelpreis_netto: Math.round((item.preis_brutto / 1.19) * 100) / 100,
      steuersatz:        19.0,
      variante_name:     item.variant_id ?? null,      // save the variant name (e.g. "50 Meter")
      artikelnummer:     item.artikelnummer ?? null,    // save product article number
    }))
  );
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const origin         = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  // H-4: Idempotency key prevents duplicate Stripe sessions on retried requests
  const idempotencyKey = `checkout-${bestellung.id}`;

  // Build session params.
  // No payment_method_types â†’ Stripe dynamically shows all methods enabled in the
  // Dashboard for the customer's location (Card, Link, Apple Pay, Google Pay, etc.)
  const sessionParams = {
    mode: 'payment' as const,
    // Collect billing address + phone from every customer (logged-in or guest)
    billing_address_collection: 'required' as const,
    phone_number_collection: { enabled: true },
    // Collect separate shipping address â€” customer may have different delivery address
    shipping_address_collection: {
      allowed_countries: ['DE', 'AT', 'CH'] as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
    },
    line_items: [
      ...verifiedItems.map((item) => {
        // Description: only Art.-Nr. â€” variant is already in the name,
        // and Stripe natively shows "je XX,XX â‚¬" for multi-quantity items.
        const description = item.artikelnummer
          ? `Art.-Nr.: ${item.artikelnummer}`
          : undefined;

        return {
          price_data: {
            currency: 'eur',
            product_data: {
              name: item.titel,
              ...(description ? { description } : {}),
              ...(item.imageUrl ? { images: [item.imageUrl] } : {}),
            },
            unit_amount: Math.round(item.preis_brutto * 100),
          },
          quantity: item.menge,
        };
      }),
    ],
    // Shipping shown as a selectable option so Stripe charges and displays it correctly
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount' as const,
          fixed_amount: { amount: Math.round(versand * 100), currency: 'eur' },
          display_name: versand === 0 ? 'Kostenloser Versand' : 'Standardversand',
        },
      },
    ],
    // Pass Stripe Customer (required for BankÃ¼berweisung).
    // Falls back to customer_email if Customer creation failed.
    ...(stripeCustomerId
      ? { customer: stripeCustomerId }
      : { customer_email: customerEmail || undefined }),
    // Configure bank transfer options â€” Stripe uses this when the customer
    // selects BankÃ¼berweisung on the hosted Checkout page.
    payment_method_options: {
      customer_balance: {
        funding_type: 'bank_transfer' as const,
        bank_transfer: {
          type: 'eu_bank_transfer' as const,
          eu_bank_transfer: { country: 'DE' },
        },
      },
    },
    metadata: { bestellung_id: bestellung.id, bestellnummer },
    // Copy metadata to the PaymentIntent so we can look up the order when
    // payment_intent.payment_failed fires (before checkout.session.completed).
    payment_intent_data: {
      metadata: { bestellung_id: bestellung.id, bestellnummer },
    },
    success_url: `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${origin}/cart`,
    // Allow customers to recover expired sessions (e.g. after failed PayPal attempts).
    // Stripe sends them a link to a new session pre-filled with their data.
    after_expiration: {
      recovery: { enabled: true },
    },
    locale: 'de' as const,
  };

  const session = await getStripe().checkout.sessions.create(sessionParams, { idempotencyKey });

  // Save stripe_session_id and stripe_customer_id back onto the order row
  await adminClient
    .from('bestellungen')
    .update({
      stripe_session_id: session.id,
      ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
    })
    .eq('id', bestellung.id);

  // If the customer is an authenticated user, persist the stripe_customer_id
  // onto their `benutzer` row so we can reuse the Stripe Customer later.
  if (stripeCustomerId && user) {
    try {
      await adminClient
        .from('benutzer')
        .update({ stripe_customer_id: stripeCustomerId })
        .is('stripe_customer_id', null)
        .eq('id', user.id);
    } catch (uErr) {
      console.error('[Checkout] Failed to save stripe_customer_id to benutzer:', uErr);
    }
  }

  return NextResponse.json({
    url:           session.url,
    session_id:    session.id,
    bestellung_id: bestellung.id,
  });
}
