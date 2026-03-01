import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

interface CheckoutItem {
  artikel_id: string;
  titel: string;
  preis_brutto: number;
  menge: number;
  bild_url?: string | null;
}

// POST /api/checkout — Create Stripe Checkout Session
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { items, kunden_email } = body as {
    items: CheckoutItem[];
    kunden_email?: string;
  };

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Warenkorb ist leer' }, { status: 400 });
  }

  // Generate order number
  const bestellnummer = `BS-${Date.now().toString(36).toUpperCase()}`;

  // Create order in DB (status: offen)
  const zwischensumme = items.reduce((s, i) => s + i.preis_brutto * i.menge, 0);
  const steuersatz = 0.19;
  const steuer = Math.round(zwischensumme * steuersatz * 100) / 100;
  const versand = 0; // Free shipping for now
  const gesamt = zwischensumme + versand;

  const { data: bestellung, error: bestellError } = await supabase
    .from('bestellungen')
    .insert({
      bestellnummer,
      status: 'offen',
      zwischensumme_brutto: zwischensumme,
      steuer_summe: steuer,
      versand_brutto: versand,
      gesamt_brutto: gesamt,
      rechnungsadresse_json: {},
      notizen: [],
    })
    .select()
    .single();

  if (bestellError) {
    return NextResponse.json({ error: bestellError.message }, { status: 500 });
  }

  // Insert order items
  const positionen = items.map((item) => ({
    bestellung_id: bestellung.id,
    artikel_id: item.artikel_id,
    typ: 'artikel',
    titel: item.titel,
    menge: item.menge,
    preis_brutto: item.preis_brutto,
    steuersatz: 19.0,
  }));

  await supabase.from('bestellpositionen').insert(positionen);

  // Create Stripe Checkout Session
  const origin = request.headers.get('origin') || 'http://localhost:3000';

  const line_items = items.map((item) => ({
    price_data: {
      currency: 'eur',
      product_data: {
        name: item.titel,
        ...(item.bild_url ? { images: [item.bild_url] } : {}),
      },
      unit_amount: Math.round(item.preis_brutto * 100), // cents
    },
    quantity: item.menge,
  }));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items,
    customer_email: kunden_email || undefined,
    metadata: {
      bestellung_id: bestellung.id,
      bestellnummer,
    },
    success_url: `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/shop?canceled=true`,
    locale: 'de',
  });

  return NextResponse.json({
    url: session.url,
    session_id: session.id,
    bestellung_id: bestellung.id,
  });
}

