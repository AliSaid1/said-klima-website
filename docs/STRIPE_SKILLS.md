# Stripe Integration Skills & Best Practices
> GitHub Copilot reference — loaded from: `npx skills add --all https://docs.stripe.com`
> Always apply these rules when working on any Stripe-related code in this project.

---

## 1. API Selection

| Use case | Use |
|---|---|
| One-time payments (redirect to Stripe) | `checkout.sessions.create` with `mode: 'payment'` |
| Subscriptions | `checkout.sessions.create` with `mode: 'subscription'` |
| Embedded payment form (no redirect) | `PaymentElement` + `PaymentIntents` |
| Marketplace / splits | `Connect` platform with `Accounts v2` |

**This project uses:** Hosted Checkout (redirect mode) — `checkout.sessions.create`.

---

## 2. Price Handling Rules

- **Always fetch prices server-side** from the database — never trust client-supplied prices.
- `artikel.preis_brutto` is **gross** (incl. VAT). To extract VAT from gross:
  ```
  VAT = gross × (rate / (1 + rate))
  e.g., VAT = 100 × (0.19 / 1.19) = 15.97 €   ← CORRECT
  NOT: 100 × 0.19 = 19 €                         ← WRONG (would be for net prices)
  ```
- Stripe `unit_amount` must be in **cents** (integer): `Math.round(preis_brutto * 100)`
- Shipping cost: free for orders ≥ 500 €, else 5 € flat rate.

---

## 3. Checkout Session Configuration (this project)

```ts
stripe.checkout.sessions.create({
  mode: 'payment',
  payment_method_types: ['card'],
  locale: 'de',
  billing_address_collection: 'required',   // ← collect billing address
  phone_number_collection: { enabled: true }, // ← collect phone number
  shipping_options: [...],                   // ← add shipping as a Stripe option
  customer_email: guestEmail || undefined,
  metadata: { bestellung_id, bestellnummer },
  success_url: `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url:  `${origin}/shop?canceled=true`,
});
```

---

## 4. Webhook Best Practices

- **Always verify the signature** with `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)`.
- Handle `checkout.session.completed` to mark orders paid and save customer details.
- Extract customer data from the event (do NOT call Stripe again unless needed):
  ```ts
  const details  = session.customer_details;  // name, email, phone, address
  const shipping = session.shipping_details;   // shipping address (if collected)
  ```
- Use `session.amount_total / 100` for the paid amount (in euros).
- Save `stripe_payment_intent_id` from `session.payment_intent` for refund lookups.
- Return `{ received: true }` with HTTP 200 — always, even for unhandled events.

---

## 5. Address JSON Format (this project)

When saving Stripe address data to `bestellungen.lieferadresse_json` / `rechnungsadresse_json`:

```json
{
  "name":      "Max Mustermann",
  "phone":     "+49 151 12345678",
  "email":     "max@example.de",
  "strasse":   "Musterstraße 1",
  "plz":       "70173",
  "ort":       "Stuttgart",
  "bundesland": "Baden-Württemberg",
  "land":      "DE"
}
```

---

## 6. Test Cards

| Card number | Scenario |
|---|---|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Declined |
| `4000 0025 0000 3155` | 3D Secure required |
| `4000 0000 0000 9995` | Insufficient funds |

---

## 7. Local Development

```powershell
# Terminal 1 — dev server
npm run dev

# Terminal 2 — forward Stripe webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the whsec_... secret into .env.local as STRIPE_WEBHOOK_SECRET
# Restart dev server after adding it
```

---

## 8. Rate Limits (this project)

- Checkout endpoint `/api/checkout`: **20 requests / 60 minutes** per IP (permissive — customers can retry)
- Auth endpoints (login, register): **5 requests / 15 minutes** per IP (strict)

---

## 9. Security Checklist

- [ ] `STRIPE_SECRET_KEY` — server-only, never exposed to client
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — safe to expose to client
- [ ] `STRIPE_WEBHOOK_SECRET` — server-only, required for webhook signature verification
- [ ] All prices fetched server-side — client prices IGNORED
- [ ] Idempotency key on `checkout.sessions.create` — prevents duplicate charges
- [ ] Webhook signature verified before processing any event

---

## 10. Going Live Checklist

- [ ] Switch to live Stripe keys in Vercel env vars
- [ ] Register production webhook in Stripe Dashboard → `https://your-domain.de/api/webhooks/stripe`
- [ ] Enable only needed events: `checkout.session.completed`, `payment_intent.payment_failed`
- [ ] Test with real €1 transaction
- [ ] Enable Stripe Radar fraud rules

