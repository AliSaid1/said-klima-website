# ✅ Banküberweisung Fix — IMPLEMENTED
> Status: **✅ IMPLEMENTED** — 2026-04-05
> Changes: checkout route, webhook handler, verify endpoint, success page, DB migration

# ✅ What your 3 screenshots tell us

### Screenshot 1 (Cart → “Zur Kasse”)

Normal entry into Flow A.

### Screenshot 2 (Stripe hosted Checkout page)

You see: **Karte, PayPal, Klarna, Amazon Pay, Revolut Pay** — but **no Banküberweisung**.

### Screenshot 3 (Stripe Dashboard → Zahlungsmethoden)

**Banküberweisung is activated** ✅ in the Dashboard, so the issue is **not** “it’s disabled”.

➡️ That combination strongly points to **one specific Stripe constraint**:

> **Bank transfers in Checkout require a Stripe Customer to be specified in the Checkout Session.** [\[docs.stripe.com\]](https://docs.stripe.com/payments/bank-transfers?locale=en-GB)

And your code confirms you **only pass `customer_email`**, not `customer`.

***

# ✅ Why Banküberweisung is “hidden” in your case (root cause)

## 1) You don’t pass `customer` in the Checkout Session

You currently set:

```ts
customer_email: kunden_email || undefined
```

…but **no**:

```ts
customer: "cus_..."
```

Stripe’s Checkout Session API clearly distinguishes these:

*   `customer` = ID of an **existing** Stripe Customer [\[docs.stripe.com\]](https://docs.stripe.com/api/checkout/sessions/create)
*   `customer_email` = only used **if** Stripe creates a customer later (depending on configuration) [\[docs.stripe.com\]](https://docs.stripe.com/api/checkout/sessions/create)

For bank transfers, Stripe states:

> **“Enabling bank transfers on the checkout page requires specifying the customer in the checkout session.”** [\[docs.stripe.com\]](https://docs.stripe.com/payments/bank-transfers?locale=en-GB)

So: ✅ **Banküberweisung is not shown because you aren’t supplying `customer`.**

***

# ✅ Minimal fix (recommended): Create/reuse Customer → pass `customer` to session

Since you already create an order (“offen”) when a guest starts checkout, you have a perfect place to:

1.  create or find a Stripe customer
2.  save `stripe_customer_id` to your order (`bestellungen`)
3.  pass `customer` when creating the Checkout Session

### Why you should persist `stripe_customer_id`

Because bank transfers are tied to the customer balance / reconciliation. Stripe’s flow is customer-based. [\[docs.stripe.com\]](https://docs.stripe.com/payments/bank-transfers?locale=en-GB), [\[docs.stripe.com\]](https://docs.stripe.com/payments/bank-transfers/accept-a-payment)

***

## ✅ Example change (server route) — minimal and clean

### `app/api/checkout/route.ts` (conceptual JS/TS style)

```ts
// 1) Create or reuse a Stripe Customer first
const customer = await stripe.customers.create({
  email: kunden_email,
  // optional: name, address, metadata, etc.
});

// 2) Persist customer.id on your order (bestellungen)
await db.bestellungen.update({
  where: { id: orderId },
  data: { stripe_customer_id: customer.id }
});

// 3) Create Checkout Session WITH customer
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  customer: customer.id, // ✅ THIS is the key
  // keep your existing line_items, success_url, cancel_url...
});
```

**This alone is often enough** for Banküberweisung to appear (given it’s enabled and currency/region fits). [\[docs.stripe.com\]](https://docs.stripe.com/payments/bank-transfers?locale=en-GB), [\[docs.stripe.com\]](https://docs.stripe.com/api/checkout/sessions/create)

***

# If it STILL doesn’t show: force it explicitly (fallback)

Sometimes merchants rely on Stripe “dynamic payment methods”, but bank transfer may still need explicit configuration depending on setup.

A known working pattern for Checkout bank transfers is:

*   include `customer_balance` as a payment method type
*   configure it to fund via `bank_transfer`

(Stripe’s own ecosystem + community examples show this “customer\_balance + bank\_transfer” approach for Checkout). [\[stackoverflow.com\]](https://stackoverflow.com/questions/75520514/stripe-add-bank-transfer-while-user-checkout), [\[cobakura.com\]](https://cobakura.com/articles/stripe-checkout-session-bank-transfer/)

### Fallback configuration (more explicit)

```ts
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  customer: customer.id,
  payment_method_types: ["card", "customer_balance"], // add customer_balance
  payment_method_options: {
    customer_balance: {
      funding_type: "bank_transfer",
      bank_transfer: {
        type: "eu_bank_transfer",
        eu_bank_transfer: { country: "DE" }
      }
    }
  }
});
```

> Note: The exact `bank_transfer.type` depends on your country/currency (for Germany/EUR it’s typically EU bank transfer). [\[docs.stripe.com\]](https://docs.stripe.com/payments/bank-transfers?locale=en-GB), [\[docs.stripe.com\]](https://docs.stripe.com/payments/bank-transfers/accept-a-payment)

***

# ✅ Webhook logic MUST change (very important for bank transfer)

Bank transfer is **delayed notification** — payment isn’t instantly confirmed.   
So if you currently treat `checkout.session.completed` as “paid”, you’ll accidentally confirm orders too early. [\[docs.stripe.com\]](https://docs.stripe.com/payments/bank-transfers/accept-a-payment)

Stripe provides explicit webhook events for delayed methods:

*   `checkout.session.async_payment_succeeded` (delayed payment finally succeeds) [\[docs.stripe.com\]](https://docs.stripe.com/cli/trigger)
*   `checkout.session.async_payment_failed` [\[docs.stripe.com\]](https://docs.stripe.com/cli/trigger)

### Recommended approach

*   On `checkout.session.completed`:
    *   **persist customer id**
    *   check `session.payment_status`
    *   only confirm if `paid`
*   On `checkout.session.async_payment_succeeded`:
    *   confirm the order (paid)
*   On `checkout.session.async_payment_failed`:
    *   mark order as failed/canceled

***

## ✅ What you should store in DB (bestellungen)

At minimum:

*   `stripe_customer_id` ✅ (you’re missing this today)
*   `stripe_checkout_session_id`
*   `stripe_payment_intent_id` (optional)
*   `payment_status` / `order_status` (offen / bezahlt / fehlgeschlagen)

Stripe Checkout Session contains a `customer` reference you can save. [\[docs.stripe.com\]](https://docs.stripe.com/api/checkout/sessions/create)

***

# ✅ Your current “guest order = offen” design fits perfectly

You said:

> guest enters → you create DB record with status “offen”

That’s exactly how you should handle bank transfers:

*   order stays **offen / awaiting payment**
*   you only buy from third party / fulfill **after payment is received** (your business rule)

This matches Stripe bank transfer being delayed. [\[docs.stripe.com\]](https://docs.stripe.com/payments/bank-transfers/accept-a-payment), [\[stripe.dev\]](https://stripe.dev/blog/observing-immediate-versus-delayed-payments-with-stripe-workbench)
