# Stripe Invoice / Rechnung — Phase 2 Strategy Plan
> Status: **📋 PLANNED — Not yet implemented**  
> Created: 2026-04-05  
> Author: GitHub Copilot  
> Depends on: Phase 1 (Checkout + PDF + Emails) ✅ Complete

---

## 1. Why This Plan Exists

### The Banküberweisung Problem

Currently, the "Zur Kasse" button redirects to **Stripe Hosted Checkout** (`mode: 'payment'`). This mode requires **instant payment** before redirecting to the success page. It supports:

✅ Karte (Visa, Mastercard, Amex)  
✅ PayPal, Klarna, Amazon Pay, Revolut Pay, Google Pay, Link  
❌ **Banküberweisung (Bank Transfer)** — CANNOT work in `mode: 'payment'`

### Why Bank Transfer Is Incompatible

Bank transfers are **asynchronous** — the customer receives a virtual IBAN + reference code, then manually sends money from their bank. This takes **1–5 business days**. Stripe Checkout `mode: 'payment'` expects instant completion, so Stripe **hides** Banküberweisung automatically.

**This is a Stripe platform limitation, not a bug in our code.** No code change to `app/api/checkout/route.ts` can make Banküberweisung appear.

### The Solution: Stripe Invoices

Stripe Invoices have their own **hosted payment page** that supports Banküberweisung. When a Stripe Invoice is created and sent to a customer, they receive an email with a link. On that page, they can choose:

- 💳 Karte (Visa, Mastercard, etc.)
- 🏦 **Banküberweisung** (SEPA bank transfer)  
- Other enabled methods

This is the **only way** to offer Banküberweisung through Stripe.

---

## 2. Two Checkout Flows (Phase 1 + Phase 2)

After Phase 2, the system will have two parallel payment flows:

```
┌─────────────────────────────────────────────────────────────────┐
│  FLOW A: Stripe Checkout (Phase 1 — CURRENT ✅)                │
│                                                                  │
│  Customer adds to cart → "Zur Kasse" → Stripe Checkout page    │
│  → Pays instantly (Karte, PayPal, Klarna, etc.)                │
│  → Redirected to success page                                   │
│  → Webhook fires → Order confirmed → PDF + Email sent          │
│                                                                  │
│  ✅ Best for: most B2C customers who want to pay immediately    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  FLOW B: Stripe Invoice / Rechnung (Phase 2 — PLANNED)         │
│                                                                  │
│  Admin creates invoice from admin dashboard                     │
│  → Stripe sends invoice email to customer                       │
│  → Customer opens hosted invoice page                           │
│  → Chooses Karte OR Banküberweisung                             │
│  → Pays (instantly or async via bank transfer)                  │
│  → Webhook fires → Invoice marked as paid → Order updated       │
│                                                                  │
│  ✅ Best for: B2B customers, large orders, bank transfer needs  │
└─────────────────────────────────────────────────────────────────┘
```

**Important:** Flow A stays exactly as it is. Flow B is an **addition**, not a replacement.

---

## 3. What Needs to Be Done in Stripe Dashboard

These are **manual configuration steps** in the Stripe Dashboard — no code required.

### 3.1 Invoice Settings

**Navigate to:** Stripe Dashboard → Settings → Billing → Invoice template

| Setting | Value | Why |
|---|---|---|
| **Company name** | KÄLTE-UND KLIMATECHNIK SAID | Shows on invoice header |
| **Company address** | Eichengrund 32, 49191 Belm, Germany | Legal requirement for German Rechnungen |
| **Tax ID (USt-IdNr.)** | Your Umsatzsteuer-Identifikationsnummer | Required for B2B invoices |
| **Invoice numbering** | Sequential (automatic) | Stripe auto-increments: INV-0001, INV-0002, etc. |
| **Payment terms** | Net 14 (or Net 30) | Days the customer has to pay |
| **Footer text** | `Kälte-und Klimatechnik Said · Eichengrund 32, 49191 Belm · kks-said.de` | Appears at bottom |
| **Logo** | Upload KKS_LOGO.png | Branded invoice |
| **Default currency** | EUR | All invoices in Euro |
| **Default tax rate** | 19% MwSt. | Create a tax rate: Dashboard → Tax rates → Add |

### 3.2 Payment Methods on Invoices

**Navigate to:** Stripe Dashboard → Settings → Billing → Invoice payment methods

Enable:
- ✅ **Card** (Visa, Mastercard, Amex)
- ✅ **Banküberweisung (Bank transfer / SEPA credit transfer)**
- ✅ Link (auto-fill)

When Banküberweisung is enabled here, it appears on the **hosted invoice payment page** — independent of the Checkout Sessions setting.

### 3.3 Email Settings

**Navigate to:** Stripe Dashboard → Settings → Billing → Emails

| Setting | Recommendation |
|---|---|
| Email invoices to customers | ✅ Enable |
| Send reminders for overdue invoices | ✅ Enable (7, 14, 21 days) |
| Send receipt after payment | ✅ Enable |

### 3.4 Create Tax Rate

**Navigate to:** Stripe Dashboard → Tax rates → + Add tax rate

| Field | Value |
|---|---|
| Display name | MwSt. |
| Description | Mehrwertsteuer 19% |
| Percentage | 19 |
| Type | Inclusive (prices already include tax) |
| Region | Germany (DE) |

Save the tax rate ID (e.g., `txr_1ABC...`) — it will be used in the API code.

---

## 4. What Needs to Be Done in Code

### 4.1 Database Migration

Add columns to `bestellungen` to track Stripe Invoice data:

```sql
-- supabase/migrations/XXX_add_stripe_invoice_fields.sql

ALTER TABLE bestellungen
  ADD COLUMN IF NOT EXISTS stripe_customer_id   TEXT,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id    TEXT,
  ADD COLUMN IF NOT EXISTS stripe_invoice_url   TEXT,
  ADD COLUMN IF NOT EXISTS stripe_invoice_pdf   TEXT,
  ADD COLUMN IF NOT EXISTS rechnung_erstellt_am TIMESTAMPTZ;
```

### 4.2 New API Route: Create Invoice

**File:** `app/api/orders/[id]/invoice/route.ts`

This route is called when the admin clicks "Rechnung erstellen" in the admin dashboard.

```
Flow:
  Admin clicks button → POST /api/orders/{id}/invoice
    → Check order exists and is 'bezahlt'
    → Create or retrieve Stripe Customer (by email)
    → Create Stripe Invoice with line items from bestellpositionen
    → Apply tax rate
    → Finalize invoice → Stripe generates PDF + sends email
    → Save stripe_invoice_id, stripe_invoice_url to bestellungen
    → Return invoice URL to admin
```

**Pseudocode:**

```ts
// 1. Guard: only admins
// 2. Fetch order + line items from DB
// 3. Find or create Stripe Customer
const customer = await stripe.customers.create({
  email: order.gast_email || order.rechnungsadresse_json.email,
  name: order.rechnungsadresse_json.name,
  address: {
    line1: order.rechnungsadresse_json.strasse,
    postal_code: order.rechnungsadresse_json.plz,
    city: order.rechnungsadresse_json.ort,
    country: order.rechnungsadresse_json.land || 'DE',
  },
});

// 4. Add invoice items (one per bestellposition)
for (const pos of lineItems) {
  await stripe.invoiceItems.create({
    customer: customer.id,
    amount: Math.round(pos.preis_brutto * pos.menge * 100), // cents
    currency: 'eur',
    description: pos.variante_name
      ? `${pos.titel} (${pos.variante_name})`
      : pos.titel,
    tax_rates: ['txr_YOUR_TAX_RATE_ID'], // 19% MwSt
  });
}

// 5. Create the invoice
const invoice = await stripe.invoices.create({
  customer: customer.id,
  collection_method: 'send_invoice', // Customer pays via hosted page
  days_until_due: 14,                // Net 14
  auto_advance: false,               // We finalize manually
  metadata: {
    bestellnummer: order.bestellnummer,
    bestellung_id: order.id,
  },
});

// 6. Finalize → Stripe generates the PDF and enables payment
const finalized = await stripe.invoices.finalizeInvoice(invoice.id);

// 7. Send the invoice email (Stripe sends it automatically when configured)
await stripe.invoices.sendInvoice(invoice.id);

// 8. Save to DB
await supabase.from('bestellungen').update({
  stripe_customer_id: customer.id,
  stripe_invoice_id: finalized.id,
  stripe_invoice_url: finalized.hosted_invoice_url,
  stripe_invoice_pdf: finalized.invoice_pdf,
  rechnung_erstellt_am: new Date().toISOString(),
}).eq('id', orderId);
```

### 4.3 New Webhook Events

**File:** `app/api/webhooks/stripe/route.ts` — add new `case` branches:

```ts
case 'invoice.paid': {
  const invoice = event.data.object as Stripe.Invoice;
  const bestellungId = invoice.metadata?.bestellung_id;
  if (bestellungId) {
    // Update order: payment confirmed via invoice
    await supabase.from('bestellungen').update({
      // If it was paid via bank transfer, update zahlungsmethode
      zahlungsmethode: 'banküberweisung', // or extract from invoice
    }).eq('id', bestellungId);

    // Record payment event
    // ... (similar to checkout.session.completed)
  }
  break;
}

case 'invoice.payment_failed': {
  const invoice = event.data.object as Stripe.Invoice;
  console.error('Invoice payment failed:', invoice.id);
  // Optionally notify admin
  break;
}

case 'invoice.sent': {
  // Invoice email was sent to customer
  console.log('Invoice sent:', event.data.object.id);
  break;
}
```

### 4.4 Admin UI: "Rechnung erstellen" Button

**File:** `app/admin/orders/[id]/page.tsx`

Add a button that appears when order status is `bezahlt` or later, and no invoice has been created yet:

```tsx
{order.status !== 'offen' && !order.stripe_invoice_id && (
  <button onClick={handleCreateInvoice}>
    Rechnung erstellen
  </button>
)}

{order.stripe_invoice_url && (
  <a href={order.stripe_invoice_url} target="_blank">
    Rechnung ansehen (Stripe)
  </a>
)}
```

---

## 5. Customer Experience Flow

### Flow B: Customer Wants to Pay via Banküberweisung

```
1. Customer places an order through normal checkout (pays with card)
   → OR: Customer contacts the shop and requests an invoice

2. Admin opens order in dashboard → clicks "Rechnung erstellen"
   → API creates Stripe Invoice → Stripe emails the customer

3. Customer receives email:
   ┌─────────────────────────────────────────┐
   │  Rechnung von KÄLTE-UND KLIMATECHNIK   │
   │  SAID                                    │
   │                                          │
   │  Rechnungsnummer: INV-0042              │
   │  Betrag: 644,20 €                       │
   │  Fällig bis: 19.04.2026                 │
   │                                          │
   │  [Rechnung bezahlen →]                   │
   └─────────────────────────────────────────┘

4. Customer clicks "Rechnung bezahlen" → Opens Stripe hosted invoice page:
   ┌─────────────────────────────────────────┐
   │  Zahlungsmethode wählen:                │
   │                                          │
   │  ○ Karte (Visa, Mastercard, ...)        │
   │  ○ Banküberweisung ← NOW AVAILABLE! 🎉 │
   │                                          │
   │  [Zahlen →]                              │
   └─────────────────────────────────────────┘

5a. If Karte: Pays instantly → invoice.paid webhook → Order updated
5b. If Banküberweisung:
    → Stripe shows virtual IBAN + reference code
    → Customer transfers money from their bank (1–5 days)
    → Stripe matches the transfer automatically
    → invoice.paid webhook fires → Order updated
```

### Alternative Flow: Invoice-Only Orders (Future)

For B2B customers who never use the cart/checkout:

```
Admin creates order manually in admin dashboard
  → Adds line items
  → Clicks "Rechnung erstellen & senden"
  → Customer receives invoice email
  → Pays via Karte or Banküberweisung
```

This is a future extension and not part of the initial Phase 2 scope.

---

## 6. Stripe Dashboard vs. Code — Summary

| Task | Where | Details |
|---|---|---|
| Company info on invoices | **Stripe Dashboard** | Settings → Billing → Invoice template |
| Tax rates (19% MwSt) | **Stripe Dashboard** | Tax rates → Create |
| Invoice payment methods | **Stripe Dashboard** | Settings → Billing → Invoice payment methods |
| Invoice email settings | **Stripe Dashboard** | Settings → Billing → Emails |
| Logo on invoices | **Stripe Dashboard** | Settings → Branding |
| Sequential numbering | **Stripe Dashboard** | Automatic (Stripe handles it) |
| Create invoice for an order | **Code** | API route + Admin UI button |
| Handle invoice.paid webhook | **Code** | Webhook handler |
| Store invoice data in DB | **Code** | Migration + API |
| Send invoice email | **Stripe** | Automatic after `sendInvoice()` call |

---

## 7. Implementation Steps

| Step | File(s) | Action | Priority |
|---|---|---|---|
| **1** | Stripe Dashboard | Configure invoice settings, tax rates, branding | 🔴 First |
| **2** | `supabase/migrations/` | Add stripe_invoice_* columns to bestellungen | 🔴 First |
| **3** | `app/api/orders/[id]/invoice/route.ts` | Create invoice API route | 🔴 Core |
| **4** | `app/api/webhooks/stripe/route.ts` | Add invoice.paid, invoice.payment_failed cases | 🔴 Core |
| **5** | `app/admin/orders/[id]/page.tsx` | "Rechnung erstellen" button + invoice link | 🔴 Core |
| **6** | `.env.local` / Vercel | Add `STRIPE_TAX_RATE_ID` env var | 🟡 Config |
| **7** | — | Test end-to-end with Stripe test mode | 🟡 Verify |
| **8** | Stripe Dashboard | Switch to live mode, re-create tax rate | 🟢 Deploy |

**Estimated effort:** 1–2 days of development + testing.

---

## 8. FAQ

### Q: Can I add Banküberweisung to the current "Zur Kasse" checkout?
**A: No.** Stripe Checkout in `mode: 'payment'` does not support bank transfers. This is a Stripe limitation. Bank transfers are only available on Stripe Invoice payment pages.

### Q: Do I need to change anything in the current checkout code?
**A: No.** Phase 1 stays exactly as it is. Phase 2 adds a parallel flow.

### Q: Will customers see both options (Checkout + Invoice)?
**A: No — they're triggered differently.** The customer always goes through the cart → "Zur Kasse" → Checkout (instant payment). The invoice flow is triggered by the admin from the dashboard when needed (e.g., B2B customer requests, large order, bank transfer preference).

### Q: Does Stripe charge extra for Invoices?
**A: No additional per-invoice fee.** The standard Stripe processing fee applies when the customer pays. Creating and sending invoices is free.

### Q: What about the PDF Bestellbestätigung we already send?
**A: Keep it.** The Phase 1 PDF (`@react-pdf/renderer`) is the branded order confirmation. The Stripe Invoice is a separate formal Rechnung with sequential invoice numbers — different purpose.

### Q: Can I also download the Stripe Invoice PDF in the admin dashboard?
**A: Yes.** The `stripe_invoice_pdf` URL (saved in DB) gives a direct PDF download. Alternatively, `stripe_invoice_url` links to the Stripe-hosted invoice page where admin and customer can both view/download it.

---

## 9. Risk Assessment

| Risk | Mitigation |
|---|---|
| Customer doesn't pay the invoice on time | Stripe sends automatic reminders (configurable) |
| Bank transfer never arrives | Stripe has a 60-day expiry; admin can void the invoice |
| Tax rate configuration error | Test thoroughly in Stripe test mode first |
| Duplicate invoices for same order | API checks `stripe_invoice_id` — if exists, return error |
| Stripe test → live mode migration | Tax rates must be re-created in live mode (test rates don't carry over) |

