import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOrderConfirmation, sendNewOrderNotification, sendOrderReceivedEmail, sendPaymentFailedEmail } from '@/lib/email';
import { generateOrderConfirmationPdf } from '@/lib/pdf';
import type { OrderPdfData } from '@/lib/pdf';
import Stripe from 'stripe';

// ── Helper: Send confirmation emails + PDF for a paid order ───────────────
// Called from both checkout.session.completed (instant payment) and
// checkout.session.async_payment_succeeded (delayed payment e.g. bank transfer).
async function sendOrderConfirmationEmails(
  supabase: ReturnType<typeof createAdminClient>,
  bestellungId: string,
  session: Stripe.Checkout.Session,
  resolvedPaymentMethod: string | null,
  rechnungsAdresse: Record<string, unknown> | null,
  lieferAdresse: Record<string, unknown> | null,
) {
  const customerEmail =
    session.customer_details?.email ?? (session.customer_email as string | null);
  const resendKey = process.env.RESEND_API_KEY;
  if (!customerEmail || !resendKey || resendKey.startsWith('re_DEIN')) return;

  const gesamt = ((session.amount_total ?? 0) / 100)
    .toLocaleString('de-DE', { style: 'currency', currency: (session.currency ?? 'eur').toUpperCase() });

  // Fetch full order data + line items for PDF generation
  const { data: fullOrder } = await supabase
    .from('bestellungen')
    .select('bestellnummer, bestellt_am, status, zahlungsmethode, zwischensumme_brutto, steuer_summe, versand_brutto, gesamt_brutto, rechnungsadresse_json, lieferadresse_json')
    .eq('id', bestellungId)
    .single();

  const { data: lineItems } = await supabase
    .from('bestellpositionen')
    .select('titel, menge, preis_brutto, einzelpreis_netto, steuersatz, artikelnummer, variante_name')
    .eq('bestellung_id', bestellungId)
    .order('erstellt_am', { ascending: true });

  // ── Generate PDF ──────────────────────────────────────────────
  let pdfBuffer: Buffer | undefined;
  try {
    const pdfData: OrderPdfData = {
      bestellnummer: fullOrder?.bestellnummer ?? session.metadata?.bestellnummer ?? bestellungId,
      bestellt_am: fullOrder?.bestellt_am ?? new Date().toISOString(),
      status: 'bezahlt',
      zahlungsmethode: fullOrder?.zahlungsmethode ?? resolvedPaymentMethod ?? null,
      kundenname: session.customer_details?.name ?? 'Kunde',
      kundenEmail: customerEmail,
      rechnungsadresse: rechnungsAdresse ?? (fullOrder?.rechnungsadresse_json as any) ?? null,
      lieferadresse: lieferAdresse ?? (fullOrder?.lieferadresse_json as any) ?? null,
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
      zwischensumme_brutto: Number(fullOrder?.zwischensumme_brutto ?? 0),
      steuer_summe: Number(fullOrder?.steuer_summe ?? 0),
      versand_brutto: Number(fullOrder?.versand_brutto ?? 0),
      gesamt_brutto: Number(fullOrder?.gesamt_brutto ?? (session.amount_total ?? 0) / 100),
    };
    pdfBuffer = await generateOrderConfirmationPdf(pdfData);
    console.log(`[PDF] Generated order confirmation PDF (${pdfBuffer.length} bytes) for ${pdfData.bestellnummer}`);
  } catch (pdfErr) {
    console.error('[PDF] Failed to generate order confirmation PDF:', pdfErr);
    // Continue without PDF — email will still be sent without attachment
  }

  // ── Send customer email (with PDF attachment) ─────────────────
  await sendOrderConfirmation({
    to: customerEmail,
    kundenname: session.customer_details?.name ?? 'Kunde',
    bestellnummer: session.metadata?.bestellnummer ?? bestellungId,
    gesamt,
    pdfBuffer,
  });

  // ── Notify admin (with PDF attachment) ────────────────────────
  const lieferAddr = lieferAdresse ?? (fullOrder?.lieferadresse_json as any);
  const addrParts = lieferAddr
    ? [lieferAddr.name, lieferAddr.strasse, `${lieferAddr.plz || ''} ${lieferAddr.ort || ''}`.trim(), lieferAddr.land].filter(Boolean)
    : [];

  await sendNewOrderNotification({
    bestellnummer: session.metadata?.bestellnummer ?? bestellungId,
    kundenname: session.customer_details?.name ?? 'Gast',
    kundenEmail: customerEmail,
    gesamt,
    lieferadresse: addrParts.join(', ') || undefined,
    items: lineItems?.map(i => ({
      titel: i.titel,
      artikelnummer: i.artikelnummer ?? null,
      menge: i.menge,
      preis_brutto: Number(i.preis_brutto),
    })),
    pdfBuffer,
  });
}

// POST /api/webhooks/stripe — Handle Stripe webhook events
export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
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
    // ── Checkout completed (may be paid instantly OR awaiting async payment) ──
    case 'checkout.session.completed': {
      const eventSession = event.data.object as Stripe.Checkout.Session;
      const bestellungId = eventSession.metadata?.bestellung_id;

      if (bestellungId) {
        // ── Retrieve the FULL session from the Stripe API ─────────────────
        // The webhook event payload may omit fields like shipping_details.
        // Fetching the full session guarantees we have billing + shipping
        // addresses, payment_intent, etc.
        const session = await getStripe().checkout.sessions.retrieve(eventSession.id, {
          expand: ['payment_intent.payment_method'],
        });
        const sessionAny = session as any;

        // ── Extract customer details collected by Stripe ───────────────────
        // Stripe API v20+ (2026-03-25.dahlia) may place data under collected_information
        const details  = session.customer_details;
        const collectedInfo = sessionAny.collected_information;

        // ── Extract card / payment details from expanded payment_intent ────
        // For bank transfers (customer_balance), payment_intent may not have
        // a payment_method yet — this is expected.
        const pi      = sessionAny.payment_intent as (Stripe.PaymentIntent & { payment_method?: Stripe.PaymentMethod }) | null;
        const pmObj   = pi?.payment_method as Stripe.PaymentMethod | undefined;
        const card    = pmObj?.card;
        const billing = pmObj?.billing_details;

        // Resolve payment method name — works for card, paypal, klarna, sepa, link, etc.
        // For bank transfers, pmObj.type is 'customer_balance'
        const resolvedPaymentMethod: string | null = (() => {
          if (!pmObj) return null;
          const pmType = pmObj.type;
          if (pmType === 'customer_balance') return 'banküberweisung';
          if (pmType === 'card' && card?.brand) return card.brand;
          return pmType || null;
        })();

        // Stripe v20+ (API 2026-03-25.dahlia): shipping is under collected_information.shipping_details
        // Fall back to legacy session.shipping_details / session.shipping for older API versions
        const shipping = collectedInfo?.shipping_details
                      ?? sessionAny.shipping_details
                      ?? sessionAny.shipping
                      ?? null;

        // Build address JSON from Stripe address (Stripe field names → our format)
        const buildAdresse = (
          addr: Stripe.Address | null | undefined,
          name: string | null | undefined,
          phone: string | null | undefined,
          email: string | null | undefined,
        ) => {
          if (!addr) return null;
          return {
            name:      name        || null,
            phone:     phone       || null,
            email:     email       || null,
            strasse:   addr.line1  || '',
            zusatz:    addr.line2  || null,
            plz:       addr.postal_code || '',
            ort:       addr.city   || '',
            bundesland: addr.state || null,
            land:      addr.country || 'DE',
          };
        };

        // ── Rechnungsadresse (billing) ─────────────────────────────────────
        // Try multiple sources — API version and payment method affect where
        // billing address lives:
        //   1. session.customer_details.address (standard)
        //   2. collected_information (Stripe API v20+)
        //   3. payment_method.billing_details.address (card payments)
        const customerName  = details?.name ?? collectedInfo?.name ?? null;
        const customerPhone = details?.phone ?? collectedInfo?.phone ?? null;
        const customerEmailAddr = details?.email ?? session.customer_email ?? null;

        const rechnungsAdresse =
          buildAdresse(details?.address, customerName, customerPhone, customerEmailAddr as string) ??
          buildAdresse(collectedInfo?.address, customerName, customerPhone, customerEmailAddr as string) ??
          buildAdresse(billing?.address, billing?.name ?? customerName, customerPhone, customerEmailAddr as string);

        // ── Lieferadresse (shipping) ───────────────────────────────────────
        const lieferAdresse = shipping?.address
          ? buildAdresse(shipping.address, shipping.name ?? customerName, customerPhone, customerEmailAddr as string)
          : rechnungsAdresse;

        // Debug: log what we extracted so we can trace address issues
        if (!rechnungsAdresse) {
          console.warn(`[Webhook] No billing address found for ${bestellungId}. customer_details.address:`, details?.address, 'collected_information:', collectedInfo ? 'present' : 'absent', 'billing_details.address:', billing?.address);
        }
        if (!lieferAdresse) {
          console.warn(`[Webhook] No shipping address found for ${bestellungId}. shipping:`, shipping ? 'present' : 'absent');
        }

        // ── Resolve Stripe Customer ID (persisted for future invoices) ─────
        const stripeCustomerId = typeof session.customer === 'string'
          ? session.customer
          : (session.customer as any)?.id ?? null;

        // ── Determine status based on payment_status ──────────────────────
        // For instant payments (card, paypal, etc.): payment_status === 'paid'
        // For delayed payments (bank transfer): payment_status === 'unpaid'
        const isPaid = session.payment_status === 'paid';
        const orderStatus = isPaid ? 'bezahlt' : 'warten_auf_zahlung';

        // Update order: status, customer data, Stripe references
        // bestellt_am uses first-write-wins — fetch current value to avoid
        // overwriting the timestamp that the verify endpoint already set.
        const { data: currentOrder } = await supabase
          .from('bestellungen')
          .select('bestellt_am')
          .eq('id', bestellungId)
          .single();

        const { error: updateError } = await supabase
          .from('bestellungen')
          .update({
            status:                    orderStatus,
            stripe_payment_intent_id:  typeof session.payment_intent === 'string'
              ? session.payment_intent
              : pi?.id ?? (eventSession.payment_intent as string),
            // Only set bestellt_am once — preserve whichever writer got here first
            ...(!currentOrder?.bestellt_am ? { bestellt_am: new Date().toISOString() } : {}),
            // Save address snapshots from Stripe (webhook is authoritative source)
            ...(rechnungsAdresse ? { rechnungsadresse_json: rechnungsAdresse } : {}),
            ...(lieferAdresse    ? { lieferadresse_json:    lieferAdresse    } : {}),
            // Save guest email
            ...(customerEmailAddr ? { gast_email: customerEmailAddr }         : {}),
            // Save payment method (e.g. "visa", "paypal", "klarna", "banküberweisung")
            ...(resolvedPaymentMethod ? { zahlungsmethode: resolvedPaymentMethod } : {}),
            // Save Stripe Customer ID (required for Phase 2 Invoices)
            ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
          })
          .eq('id', bestellungId);

        if (updateError) {
          console.error(`[Webhook] Failed to update order ${bestellungId}:`, updateError);
        }

        // Create payment record only if one doesn't exist yet
        // (the verify endpoint may have already created it when the customer landed on the success page)
        const { data: existingZahlung } = await supabase
          .from('zahlungen')
          .select('id')
          .eq('bestellung_id', bestellungId)
          .limit(1)
          .maybeSingle();

        if (!existingZahlung) {
          await supabase.from('zahlungen').insert({
            bestellung_id: bestellungId,
            anbieter: 'stripe',
            status: isPaid ? 'erfasst' : 'ausstehend',
            betrag_brutto: (session.amount_total || 0) / 100,
            waehrung: session.currency || 'EUR',
            stripe_payment_intent_id: session.payment_intent as string,
          });
        }

        // Record payment event (always, even if zahlungen already existed)
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

        // ── Send emails based on payment status ────────────────────────────
        if (isPaid) {
          // Instant payment (card, PayPal, etc.) — send full confirmation + PDF
          await sendOrderConfirmationEmails(
            supabase, bestellungId, session,
            resolvedPaymentMethod, rechnungsAdresse, lieferAdresse,
          );
          console.log(`Order ${bestellungId} marked as bezahlt`);
        } else {
          // Delayed payment (bank transfer) — send "Bestellung eingegangen" email
          // so the customer knows their order was placed successfully.
          // Full confirmation + PDF will follow when payment arrives
          // (checkout.session.async_payment_succeeded).
          const customerEmail =
            session.customer_details?.email ?? (session.customer_email as string | null);
          const resendKey = process.env.RESEND_API_KEY;
          if (customerEmail && resendKey && !resendKey.startsWith('re_DEIN')) {
            const gesamt = ((session.amount_total ?? 0) / 100)
              .toLocaleString('de-DE', { style: 'currency', currency: (session.currency ?? 'eur').toUpperCase() });

            // 1. "Bestellung eingegangen" email to customer
            await sendOrderReceivedEmail({
              to: customerEmail,
              kundenname: session.customer_details?.name ?? 'Kunde',
              bestellnummer: session.metadata?.bestellnummer ?? bestellungId,
              gesamt,
              zahlungsmethode: 'Banküberweisung',
            });

            // 2. Notify admin about the new pending order
            const { data: lineItems } = await supabase
              .from('bestellpositionen')
              .select('titel, menge, preis_brutto, artikelnummer')
              .eq('bestellung_id', bestellungId)
              .order('erstellt_am', { ascending: true });

            const lieferAddr = lieferAdresse ?? null;
            const addrParts = lieferAddr
              ? [lieferAddr.name, lieferAddr.strasse, `${lieferAddr.plz || ''} ${lieferAddr.ort || ''}`.trim(), lieferAddr.land].filter(Boolean)
              : [];

            await sendNewOrderNotification({
              bestellnummer: session.metadata?.bestellnummer ?? bestellungId,
              kundenname: session.customer_details?.name ?? 'Gast',
              kundenEmail: customerEmail,
              gesamt: `${gesamt} (⏳ Banküberweisung ausstehend)`,
              lieferadresse: addrParts.join(', ') || undefined,
              items: lineItems?.map(i => ({
                titel: i.titel,
                artikelnummer: i.artikelnummer ?? null,
                menge: i.menge,
                preis_brutto: Number(i.preis_brutto),
              })),
            });
          }

          console.log(`Order ${bestellungId} marked as ${orderStatus} — awaiting async payment (e.g. bank transfer). Customer + admin notified.`);
        }
      }
      break;
    }

    // ── Delayed payment succeeded (bank transfer arrived) ────────────────────
    case 'checkout.session.async_payment_succeeded': {
      const eventSession = event.data.object as Stripe.Checkout.Session;
      const bestellungId = eventSession.metadata?.bestellung_id;

      if (bestellungId) {
        const session = await getStripe().checkout.sessions.retrieve(eventSession.id, {
          expand: ['payment_intent.payment_method'],
        });

        // Resolve payment method
        const sessionAny = session as any;
        const pi = sessionAny.payment_intent as any;
        const pmObj = pi?.payment_method as Stripe.PaymentMethod | undefined;
        const resolvedPaymentMethod: string | null = (() => {
          if (!pmObj) return 'banküberweisung';
          const pmType = pmObj.type;
          if (pmType === 'customer_balance') return 'banküberweisung';
          if (pmType === 'card' && pmObj.card?.brand) return pmObj.card.brand;
          return pmType || 'banküberweisung';
        })();

        // Update order to bezahlt
        await supabase
          .from('bestellungen')
          .update({
            status: 'bezahlt',
            ...(resolvedPaymentMethod ? { zahlungsmethode: resolvedPaymentMethod } : {}),
          })
          .eq('id', bestellungId);

        // Update zahlung status
        await supabase
          .from('zahlungen')
          .update({ status: 'erfasst' })
          .eq('bestellung_id', bestellungId);

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
            ereignis: 'checkout.session.async_payment_succeeded',
            betrag_brutto: (session.amount_total || 0) / 100,
            rohdaten: JSON.parse(JSON.stringify(session)),
          });
        }

        // Fetch saved addresses from DB (were persisted during checkout.session.completed)
        const { data: order } = await supabase
          .from('bestellungen')
          .select('rechnungsadresse_json, lieferadresse_json')
          .eq('id', bestellungId)
          .single();

        // Send confirmation emails + PDF now that payment is confirmed
        await sendOrderConfirmationEmails(
          supabase, bestellungId, session,
          resolvedPaymentMethod,
          (order?.rechnungsadresse_json as any) ?? null,
          (order?.lieferadresse_json as any) ?? null,
        );

        console.log(`Order ${bestellungId} async payment succeeded — marked as bezahlt`);
      }
      break;
    }

    // ── Delayed payment failed (bank transfer never arrived / expired) ───────
    case 'checkout.session.async_payment_failed': {
      const eventSession = event.data.object as Stripe.Checkout.Session;
      const bestellungId = eventSession.metadata?.bestellung_id;

      if (bestellungId) {
        await supabase
          .from('bestellungen')
          .update({ status: 'fehlgeschlagen' })
          .eq('id', bestellungId);

        // Update zahlung status
        await supabase
          .from('zahlungen')
          .update({ status: 'fehlgeschlagen' })
          .eq('bestellung_id', bestellungId);

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
            ereignis: 'checkout.session.async_payment_failed',
            betrag_brutto: 0,
            rohdaten: JSON.parse(JSON.stringify(eventSession)),
          });
        }

        // ── Send failure notification to customer ────────────────────────
        const customerEmail =
          eventSession.customer_details?.email ?? (eventSession.customer_email as string | null);
        const resendKey = process.env.RESEND_API_KEY;
        if (customerEmail && resendKey && !resendKey.startsWith('re_DEIN')) {
          const { data: orderData } = await supabase
            .from('bestellungen')
            .select('bestellnummer, gesamt_brutto')
            .eq('id', bestellungId)
            .single();

          const gesamt = ((eventSession.amount_total ?? orderData?.gesamt_brutto ?? 0) / 100)
            .toLocaleString('de-DE', { style: 'currency', currency: (eventSession.currency ?? 'eur').toUpperCase() });

          await sendPaymentFailedEmail({
            to: customerEmail,
            kundenname: eventSession.customer_details?.name ?? 'Kunde',
            bestellnummer: eventSession.metadata?.bestellnummer ?? orderData?.bestellnummer ?? bestellungId,
            gesamt,
          });
        }

        console.error(`Order ${bestellungId} async payment FAILED — customer notified`);
      }
      break;
    }

    // ── Payment failed (card declined, PayPal failed, Revolut failed, etc.) ────
    // This fires while the checkout session is still active — the customer can
    // retry with a different payment method on Stripe's hosted page.
    // We record the failure attempt in our DB for tracking purposes.
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const failureMessage = paymentIntent.last_payment_error?.message ?? 'Unknown error';
      const failureCode = paymentIntent.last_payment_error?.code ?? 'unknown';

      // Try to find the associated order via metadata (set by payment_intent_data.metadata)
      const bestellungId = paymentIntent.metadata?.bestellung_id;
      if (bestellungId) {
        // Record payment failure event in zahlungsvorgaenge
        const { data: zahlung } = await supabase
          .from('zahlungen')
          .select('id')
          .eq('bestellung_id', bestellungId)
          .order('erstellt_am', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (zahlung) {
          await supabase.from('zahlungsvorgaenge').insert({
            zahlung_id: zahlung.id,
            ereignis: 'payment_intent.payment_failed',
            betrag_brutto: (paymentIntent.amount || 0) / 100,
            rohdaten: {
              payment_intent_id: paymentIntent.id,
              failure_code: failureCode,
              failure_message: failureMessage,
              payment_method_type: paymentIntent.last_payment_error?.payment_method?.type ?? null,
            },
          });
        }

        console.error(`[Webhook] Payment failed for order ${bestellungId}: ${failureCode} — ${failureMessage} (PI: ${paymentIntent.id})`);
      } else {
        console.error(`[Webhook] Payment failed: ${paymentIntent.id} — ${failureCode}: ${failureMessage} (no bestellung_id in metadata)`);
      }
      break;
    }

    // ── Checkout session expired (customer gave up / session timed out) ───────
    // This fires when the Stripe Checkout session expires (default: 24h) without
    // completing. The customer might have failed payment and given up.
    // We mark the order as 'storniert' (cancelled) so the admin knows.
    case 'checkout.session.expired': {
      const expiredSession = event.data.object as Stripe.Checkout.Session;
      const bestellungId = expiredSession.metadata?.bestellung_id;

      if (bestellungId) {
        // Only mark as cancelled if the order is still in 'offen' state
        // (don't overwrite 'bezahlt' or 'warten_auf_zahlung' orders)
        const { data: order } = await supabase
          .from('bestellungen')
          .select('status')
          .eq('id', bestellungId)
          .single();

        if (order && order.status === 'offen') {
          await supabase
            .from('bestellungen')
            .update({ status: 'storniert' })
            .eq('id', bestellungId);

          console.log(`[Webhook] Checkout session expired — order ${bestellungId} marked as storniert`);
        } else {
          console.log(`[Webhook] Checkout session expired for order ${bestellungId} but status is '${order?.status}' — no change`);
        }

        // Check if session has a recovery URL (from after_expiration.recovery)
        const recoveryUrl = (expiredSession as any).after_expiration?.recovery?.url;
        if (recoveryUrl) {
          console.log(`[Webhook] Recovery URL available for expired session: ${recoveryUrl}`);
        }
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

