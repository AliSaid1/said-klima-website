# Stripe Checkout Integration Plan
> Status: **✅ LARGELY COMPLETE**  
> Created: 2026-03-29 | Last Updated: 2026-04-04  
> Author: GitHub Copilot  

---

## 1. Current State of the Project

### What already exists

| File | Role | Status |
|---|---|---|
| `lib/stripe.js` | Stripe client singleton (`new Stripe(STRIPE_SECRET_KEY)`) | ✅ Done |
| `app/api/checkout/route.ts` | POST handler — creates a **redirect-mode** Stripe Checkout Session, writes `bestellungen` + `bestellpositionen` to DB | ✅ Done |
| `app/api/webhooks/stripe/route.ts` | Stripe webhook handler — on `checkout.session.completed` marks order `bezahlt`, creates `zahlungen` row | ✅ Done |
| `app/shop/success/page.tsx` | Success screen — shown after redirect back from Stripe | ✅ Done |
| `app/cart/page.tsx` | Cart UI — calls `POST /api/checkout`, redirects to `session.url` | ✅ Done |
| `app/actions/stripe.js` | **Embedded** Stripe quick-start snippet (from Stripe docs) — uses `fetchClientSecret` + `ui_mode: 'embedded_page'` | ⚠️ Pasted but not wired up |
| `.env.local` | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` + `STRIPE_SECRET_KEY` set (test keys) | ✅ Done |
| `.env.local` | `STRIPE_WEBHOOK_SECRET` commented out — **must be set** for webhooks | ❌ Missing |

### Two different Stripe modes

Stripe offers two checkout experiences:

| Mode | How it works | What we have |
|---|---|---|
| **Redirect (Hosted)** | Customer is redirected to `checkout.stripe.com`, pays, comes back to success URL | `app/api/checkout/route.ts` — **already working** |
| **Embedded** | A Stripe payment form is embedded inside *your page* (no redirect), customer never leaves your site | `app/actions/stripe.js` snippet — not yet wired |

**Recommendation for this project: Keep Redirect mode (Hosted Checkout).**  
Reasons:
- Already fully implemented — cart → API → Stripe → webhook → success.
- Hosted Checkout handles PCI compliance automatically.
- Less code, less maintenance, mobile-optimised out of the box.
- Embedded mode requires adding `@stripe/stripe-js` + `@stripe/react-stripe-js` packages and a dedicated checkout page.

The rest of this plan covers: making the existing redirect checkout **fully testable locally** and fixing the missing webhook secret.

---

## 2. What Needs to Be Done

### 2.1 Set the webhook secret (critical)

The webhook route already exists but will reject every Stripe event because `STRIPE_WEBHOOK_SECRET` is not set.

```
# .env.local — add this after registering the webhook endpoint
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
```

How to get this secret → see §3 (local testing with Stripe CLI).

---

### 2.2 Fix `lib/stripe.js` → `lib/stripe.ts`

The current file is plain JS. The rest of the project uses TypeScript. Convert it:

```ts
// lib/stripe.ts
import 'server-only';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});
```

Update all imports from `@/lib/stripe` (already correct in existing routes).

---

### 2.3 Archive the quick-start snippet

`app/actions/stripe.js` contains the Stripe embedded quick-start snippet with a placeholder `price: '{{PRICE_ID}}'`.  
**It should not be used in production** — our checkout creates dynamic line items from the cart.  
Move it to `_archive/scripts-legacy/stripe-embedded-quickstart.js` and delete the original.

---

### 2.4 Improve the success page

`app/shop/success/page.tsx` currently:
- Clears localStorage cart on mount ✅
- Shows a static thank-you message

It should also:
- Verify the session server-side via `GET /api/checkout/verify?session_id=…` (optional but good practice).
- Show the order number from `bestellungen.bestellnummer` (metadata `bestellnummer` is already on the Stripe session).

---

### 2.5 Send order confirmation email (existing TODO)

`app/api/webhooks/stripe/route.ts` has a `// TODO: Send order confirmation email via Resend` comment.  
This should be implemented when `RESEND_API_KEY` is set.

---

## 3. Local Testing with Stripe CLI

### Step 1 — Install Stripe CLI

```powershell
# Windows (using Scoop)
scoop install stripe

# Or download the binary from https://github.com/stripe/stripe-cli/releases
# and add it to your PATH
```

Verify installation:
```powershell
stripe --version
```

### Step 2 — Login to Stripe

```powershell
stripe login
```

This opens the browser and links the CLI to your Stripe test account.

### Step 3 — Start the dev server

```powershell
npm run dev
```

### Step 4 — Forward webhooks to localhost

In a **second terminal** window, run:

```powershell
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This outputs something like:
```
> Ready! Your webhook signing secret is whsec_1234abcd...
```

Copy that secret and add it to `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_1234abcd...
```

Then restart the dev server so the new env var is loaded.

### Step 5 — Test a purchase

1. Open `http://localhost:3000/shop`
2. Add a product to the cart
3. Go to cart → click **Zur Kasse** (checkout)
4. You are redirected to Stripe Checkout (test mode)
5. Use the test card: `4242 4242 4242 4242`, any future expiry, any CVC
6. Complete payment → redirected to `/shop/success`
7. Check the Stripe CLI terminal — you should see `checkout.session.completed` received
8. Check Supabase Table Editor → `bestellungen` row should have `status = 'bezahlt'`

### Test Cards Reference

| Card | Scenario |
|---|---|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Declined |
| `4000 0025 0000 3155` | 3D Secure required |

---

## 4. Files to Create / Modify

| Action | File | Priority | Status |
|---|---|---|---|
| **Convert** JS → TS | `lib/stripe.ts` (rename from `.js`) | 🔴 High | ✅ Done |
| **Add** env var | `.env.local` → `STRIPE_WEBHOOK_SECRET` | 🔴 High (needed for webhooks) | ✅ Done |
| **Move** | `app/actions/stripe.js` → `_archive/` | 🟡 Medium | ✅ Done |
| **Improve** | `app/shop/success/page.tsx` — show order number, items, PDF download | 🟡 Medium | ✅ Done |
| **Implement** | Order confirmation email with PDF in webhook handler | 🟢 Low (needs `RESEND_API_KEY`) | ✅ Done |

---

## 5. Embedded Checkout (Optional Future Feature)

If you want to keep the customer on your site (no redirect to Stripe), the embedded approach works like this:

```
Customer on /kasse page
    ↓
POST /api/checkout/session  (returns client_secret)
    ↓
React renders <EmbeddedCheckout fetchClientSecret={...} />
    ↓
Customer fills card in embedded iframe
    ↓
Stripe calls return_url (/shop/return?session_id=...)
    ↓
App verifies session and shows confirmation
```

**Extra packages needed:**
```powershell
npm install @stripe/stripe-js @stripe/react-stripe-js
```

**Extra pages/components needed:**
- `app/kasse/page.tsx` — hosts the embedded checkout
- `app/return/page.tsx` — handles the return URL
- `components/shop/EmbeddedCheckout.tsx` — renders `<EmbeddedCheckout />`
- `app/api/checkout/session/route.ts` — creates session with `ui_mode: 'embedded'`

This is **not recommended right now** because the redirect (hosted) checkout is already working. Come back to this if you want a fully in-app checkout experience.

---

## 6. Checklist Before Going Live

- [ ] Switch Stripe keys from **test** to **live** in Vercel environment variables
- [ ] Register a production webhook endpoint in Stripe Dashboard → `https://your-domain.de/api/webhooks/stripe`
- [ ] Add the production `STRIPE_WEBHOOK_SECRET` to Vercel env vars
- [ ] Enable the events you handle:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `checkout.session.expired`
  - `payment_intent.payment_failed`
- [ ] Test with a real €1 transaction
- [ ] Verify `bestellungen` table is updated and confirmation email is sent
- [ ] Enable Stripe Radar fraud rules in the dashboard

---

## 7. Payment Failure Behavior (PayPal, Revolut, etc.)

### What happens when an external payment method fails

```
Customer on Stripe Hosted Checkout
    ↓ selects PayPal / Revolut
    ↓ redirected to PayPal / Revolut
    ↓ payment FAILS
    ↓ redirected BACK to Stripe Checkout page
    ↓ Stripe should show error banner → customer can retry
```

### Known limitation: Stripe's hosted checkout page

When PayPal/Revolut fails and the customer is redirected back to Stripe's hosted
checkout page, **Stripe controls the error display** — we cannot inject custom error
messages. In test mode, Stripe may not always show the failure banner prominently.

In **production mode**, Stripe displays:
> "We are unable to authenticate your payment method. Please choose a different payment method and try again."

### What we track on our end

| Event | What we do |
|---|---|
| `payment_intent.payment_failed` | Record failure in `zahlungsvorgaenge` with error code + message |
| `checkout.session.expired` | Mark order as `storniert` (only if still `offen`) |
| Customer clicks "Cancel" on Stripe | Redirected to `/cart?canceled=true` → amber banner + toast |

### Session recovery (after_expiration.recovery)

If a Stripe Checkout session expires after payment failures, Stripe can generate
a recovery URL that lets the customer retry without starting over. This is enabled
via `after_expiration.recovery.enabled = true` on our session creation.

---

## 8. Summary

```
CURRENT STATE (2026-04-05)
──────────────────────────
Cart → POST /api/checkout → Stripe Hosted Checkout → /shop/success
       ↑ All working          ↑ All payment methods    ↑ Shows order details
       ↑ Server-side prices   ↑ incl. Banküberweisung  ↑ PDF download
       
Webhook events handled:
  ✅ checkout.session.completed        → bezahlt / warten_auf_zahlung
  ✅ checkout.session.async_payment_succeeded → bezahlt + email + PDF
  ✅ checkout.session.async_payment_failed   → fehlgeschlagen + email
  ✅ checkout.session.expired          → storniert (if still offen)
  ✅ payment_intent.payment_failed     → tracked in zahlungsvorgaenge

Email flow:
  Instant payment (card/PayPal)     → Bestellbestätigung + PDF
  Bank transfer (pending)           → Bestellung eingegangen (no PDF)
  Bank transfer (paid)              → Bestellbestätigung + PDF
  Bank transfer (failed)            → Zahlung fehlgeschlagen
  Checkout cancelled / expired      → Banner on cart page (client-side)
```

