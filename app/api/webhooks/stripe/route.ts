import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import Stripe from 'stripe';

// POST /api/webhooks/stripe — Handle Stripe webhook events
export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const bestellungId = session.metadata?.bestellung_id;

      if (bestellungId) {
        // Update order status to 'bezahlt'
        await supabase
          .from('bestellungen')
          .update({
            status: 'bezahlt',
            bestellt_am: new Date().toISOString(),
          })
          .eq('id', bestellungId);

        // Create payment record
        await supabase.from('zahlungen').insert({
          bestellung_id: bestellungId,
          anbieter: 'stripe',
          status: 'erfasst',
          betrag_brutto: (session.amount_total || 0) / 100,
          waehrung: session.currency || 'EUR',
          stripe_payment_intent_id: session.payment_intent as string,
        });

        // Record payment event
        const { data: zahlung } = await supabase
          .from('zahlungen')
          .select('id')
          .eq('bestellung_id', bestellungId)
          .order('erstellt_am', { ascending: false })
          .limit(1)
          .single();

        if (zahlung) {
          await supabase.from('zahlungsvorgaenge').insert({
            zahlung_id: zahlung.id,
            ereignis: 'checkout.session.completed',
            betrag_brutto: (session.amount_total || 0) / 100,
            rohdaten: JSON.parse(JSON.stringify(session)),
          });
        }

        // TODO: Send order confirmation email via Resend
        console.log(`Order ${bestellungId} marked as bezahlt`);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.error('Payment failed:', paymentIntent.id);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

