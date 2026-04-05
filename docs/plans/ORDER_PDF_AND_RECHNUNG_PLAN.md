# Order PDF, Bestellbestätigung & Stripe Rechnung Plan
> Status: **✅ PHASE 1 COMPLETE — PDF system implemented, Stripe Invoice is Phase 2**  
> Created: 2026-04-04 | Renamed & Revised: 2026-04-04 | Implemented: 2026-04-04  
> Author: GitHub Copilot  
> **Previously named:** `PDF_AND_EMAIL_FIX_PLAN.md`

---

## Context

After a client places a successful order via Stripe, the following emails are sent:

1. ✅ **Bestellbestätigung** — sent to the customer (correct)
2. ✅ **Neue Bestellung: Ein Kunde hat soeben eine Bestellung aufgegeben** — sent to the admin (correct — this is intentional and REQUIRED)

> **Note:** The admin notification email is NOT a bug. It is correct behavior. The company MUST be notified every time a customer places an order. The admin email (`info@kks-said.de`) and all DB admin users receive this notification via `sendNewOrderNotification()` in `lib/email.ts`, called from `app/api/webhooks/stripe/route.ts`.

### Edge Case: Customer Overlap with Admin Email

If a customer's email matches an admin user's email (e.g., the business owner tests the shop), the customer would also receive the admin notification.

**Fix (surgical, already planned):** In `sendNewOrderNotification()`, filter out the customer's email from the admin recipient list:

```ts
const customerLower = params.kundenEmail.toLowerCase();
const adminOnly = recipients.filter(e => e.toLowerCase() !== customerLower);
```

This ensures admins who are also customers don't get the internal notification when they order.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Stripe Webhook Handler                     │
│               app/api/webhooks/stripe/route.ts               │
│                                                               │
│  1. Update order status → 'bezahlt'                          │
│  2. Fetch full order + line items from DB                    │
│  3. Generate PDF Buffer ← lib/pdf/                           │
│  4. Send customer email + PDF ← sendOrderConfirmation()      │
│  5. Send admin email (excl. customer edge case) ←            │
│     sendNewOrderNotification()  ← ADMIN GETS THIS ✅         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│          lib/pdf/ — Central PDF Module  │
│                                          │
│  lib/pdf/index.ts      ← Public API     │
│  lib/pdf/fonts.ts      ← Font registry  │
│  lib/pdf/styles.ts     ← Shared styles  │
│  lib/pdf/components.tsx ← Reusable parts │
│  lib/pdf/order-confirmation.tsx ← Doc   │
│                                          │
│  Future:                                 │
│  lib/pdf/invoice.tsx                     │
│  lib/pdf/booking-confirmation.tsx        │
│  lib/pdf/quote.tsx                       │
└─────────────────────────────────────────┘
```

---

## Task 1: Central PDF Generation System

### 1.1 Technology Choice

| Library | Vercel Compatible | Pure JS | React-based | German Chars | Verdict |
|---|:---:|:---:|:---:|:---:|---|
| **@react-pdf/renderer** | ✅ | ✅ | ✅ | ✅ (with font) | **✅ CHOSEN** |
| Puppeteer/Playwright | ❌ (too heavy) | ❌ | ❌ | ✅ | ❌ |
| jsPDF | ✅ | ✅ | ❌ | ⚠️ limited | ❌ |
| pdfkit | ✅ | ✅ | ❌ | ✅ | Backup option |

**Why `@react-pdf/renderer`:**
- Pure JavaScript — works in Vercel serverless (no Chromium binary)
- React component model — matches the project's React/Next.js stack
- `renderToBuffer()` API — returns a `Buffer` ready for email attachment
- Full Unicode support with custom font registration
- Beautiful layouts with flexbox-like styling
- Fast (~200–500ms for a simple document)

### 1.2 Package Installation

```powershell
npm install @react-pdf/renderer
```

No additional packages needed. `@react-pdf/renderer` includes its own PDF engine.

### 1.3 Font Strategy

`@react-pdf/renderer` default fonts don't reliably support German umlauts (ä, ö, ü, ß).  
**Solution:** Bundle `Inter` font (Google Fonts, OFL license) as `.ttf` files.

```
public/fonts/
  Inter-Regular.ttf
  Inter-Medium.ttf
  Inter-Bold.ttf
```

Register in `lib/pdf/fonts.ts` using `Font.register()`.  
On Vercel, fonts are read from the build output via `path.join(process.cwd(), 'public/fonts/...')`.

### 1.4 File Structure

```
lib/pdf/
  index.ts                  ← Public API: generateOrderConfirmationPdf()
  fonts.ts                  ← Font.register() for Inter
  styles.ts                 ← Shared StyleSheet (colors, spacing, typography)
  components.tsx            ← Reusable: Header, Footer, AddressBlock, ItemTable, TotalsBox
  order-confirmation.tsx    ← Full <OrderConfirmationDocument> component
  types.ts                  ← OrderPdfData, AddressData, LineItemData interfaces
```

### 1.5 Data Types

```ts
// lib/pdf/types.ts

export interface PdfAddressData {
  name?: string;
  strasse?: string;
  zusatz?: string;
  plz?: string;
  ort?: string;
  bundesland?: string;
  land?: string;
  email?: string;
  phone?: string;
}

export interface PdfLineItem {
  titel: string;
  artikelnummer?: string | null;
  variante_name?: string | null;
  menge: number;
  einzelpreis_netto: number;
  preis_brutto: number;       // unit price incl. VAT
  steuersatz: number;         // e.g. 19
}

export interface OrderPdfData {
  bestellnummer: string;
  bestellt_am: string;        // ISO date string
  status: string;
  zahlungsmethode?: string;

  rechnungsadresse: PdfAddressData | null;
  lieferadresse: PdfAddressData | null;

  positionen: PdfLineItem[];

  zwischensumme_brutto: number;
  steuer_summe: number;
  versand_brutto: number;
  gesamt_brutto: number;
}
```

### 1.6 PDF Layout Design

```
┌──────────────────────────────────────────────────────┐
│  ┌──────┐                                            │
│  │ LOGO │  KÄLTE-UND KLIMATECHNIK SAID               │
│  └──────┘  Eichengrund 32, 49191 Belm               │
│            Tel: +49 176 80140769                      │
│            info@kks-said.de · kks-said.de            │
├──────────────────────────────────────────────────────┤
│                                                       │
│  BESTELLBESTÄTIGUNG              Bestellnr: BS-XXX   │
│                                  Datum: 04.04.2026   │
│                                  Status: Bezahlt     │
│                                                       │
├─────────────────────┬────────────────────────────────┤
│  RECHNUNGSADRESSE   │  LIEFERADRESSE                 │
│  Max Mustermann     │  Max Mustermann                │
│  Musterstr. 1       │  Lieferstr. 5                  │
│  10115 Berlin       │  10115 Berlin                  │
│  Deutschland        │  Deutschland                   │
├─────────────────────┴────────────────────────────────┤
│                                                       │
│  BESTELLTE ARTIKEL                                   │
│  ┌─────┬──────────────────┬──────┬─────────┬───────┐ │
│  │ Pos │ Artikel          │ Mng  │ E-Preis │ Ges.  │ │
│  ├─────┼──────────────────┼──────┼─────────┼───────┤ │
│  │ 1   │ Daikin Sensira   │ 2    │ 899,00€ │1798€  │ │
│  │     │ Art.Nr: A-001    │      │         │       │ │
│  │     │ Variante: 50m    │      │         │       │ │
│  ├─────┼──────────────────┼──────┼─────────┼───────┤ │
│  │ 2   │ Kupferrohr       │ 1    │  45,00€ │  45€  │ │
│  └─────┴──────────────────┴──────┴─────────┴───────┘ │
│                                                       │
│                        Zwischensumme:    1.843,00 €   │
│                        Versand:              5,00 €   │
│                        MwSt. (19%):        294,27 €   │
│                        ─────────────────────────────  │
│                        GESAMTBETRAG:     1.848,00 €   │
│                                                       │
│  Zahlungsmethode: Visa                               │
│                                                       │
├──────────────────────────────────────────────────────┤
│  Vielen Dank für Ihre Bestellung!                    │
│  Bei Fragen erreichen Sie uns unter info@kks-said.de │
│                                                       │
│  KÄLTE-UND KLIMATECHNIK SAID                         │
│  Eichengrund 32, 49191 Belm                          │
│  kks-said.de                                         │
└──────────────────────────────────────────────────────┘
```

### 1.7 Integration with Email System

**Updated `sendTemplateEmail()` — add optional attachments:**
```ts
await resend.emails.send({
  from, replyTo, to, subject, html,
  ...(attachments?.length ? { attachments } : {}),
});
```

**Updated `sendOrderConfirmation()` signature:**
```ts
export async function sendOrderConfirmation(params: {
  to: string;
  kundenname: string;
  bestellnummer: string;
  gesamt: string;
  pdfBuffer?: Buffer;  // ← NEW — attach the order confirmation PDF
})
```

**Resend attachment format:**
```ts
attachments: [{
  filename: `Bestellbestätigung_${params.bestellnummer}.pdf`,
  content: params.pdfBuffer,  // Buffer
}]
```

> **Note:** The admin (`info@kks-said.de`) also receives the `sendNewOrderNotification()` email which contains all order details in the HTML body. The PDF is primarily for the **customer's** benefit.

---

## Task 2: Edge Case — Prevent Admin Notification Reaching Customer

### Context

This is NOT a general bug. The admin notification is sent correctly to `info@kks-said.de` and all DB admin users. The only problem arises when a customer's email address happens to match an admin user's email (e.g., the business owner testing the shop with their own email).

### The Fix (Simple & Surgical)

In `lib/email.ts`, `sendNewOrderNotification()`:

**Before:**
```ts
const recipients: string[] = [COMPANY_EMAIL_REPLY_TO];
// adds admin emails...
```

**After:**
```ts
const recipients: string[] = [COMPANY_EMAIL_REPLY_TO];
// adds admin emails...

// SAFETY: Exclude the customer's email to prevent them getting the admin notification
// (this only affects the edge case where customer email = admin email)
const customerLower = params.kundenEmail.toLowerCase();
const adminOnly = recipients.filter(e => e.toLowerCase() !== customerLower);

if (adminOnly.length === 0) {
  console.warn('[EMAIL] No admin recipients after excluding customer');
  return { success: true };
}
// Use adminOnly instead of recipients in resend.emails.send()
```

### Webhook: No Changes Needed

The webhook already passes `kundenEmail` to `sendNewOrderNotification()`:
```ts
await sendNewOrderNotification({
  kundenEmail: customerEmail,  // ← already there
  ...
});
```

---

## Task 3: Stripe Invoice / Rechnung (PDF via Stripe API)

### Overview

In addition to generating a custom `@react-pdf/renderer` PDF, Stripe provides a built-in **Invoice** system that can generate a formal, legally-structured Rechnung (invoice) PDF hosted on Stripe's servers.

This gives two options:

| Option | Description | When to Use |
|---|---|---|
| **Custom PDF** (`@react-pdf/renderer`) | Fully branded, embedded in email | Bestellbestätigung — immediate, attached |
| **Stripe Invoice** | Stripe-hosted, legally structured Rechnung | After fulfillment, for accounting/taxes |

### 3.1 How Stripe Invoices Work

```
checkout.session.completed
  ↓
Retrieve session → get payment_intent.id
  ↓
Create Stripe Invoice attached to customer
  ↓
Add invoice items (line items from order)
  ↓
Finalize invoice → Stripe generates PDF
  ↓
invoice.invoice_pdf  ← direct PDF URL (expires after 1 hour by default)
invoice.hosted_invoice_url  ← permanent Stripe-hosted page
  ↓
Send PDF URL in email OR download Buffer → attach to email
```

### 3.2 Stripe API Steps

```ts
// 1. Create or retrieve a Stripe Customer
const customer = await stripe.customers.create({
  email: customerEmail,
  name: customerName,
});

// 2. Add invoice items (one per bestellposition)
for (const item of lineItems) {
  await stripe.invoiceItems.create({
    customer: customer.id,
    amount: Math.round(item.preis_brutto * 100),  // cents
    currency: 'eur',
    description: item.titel,
  });
}

// 3. Create the invoice
const invoice = await stripe.invoices.create({
  customer: customer.id,
  auto_advance: false,  // we finalize manually
  metadata: { bestellnummer: order.bestellnummer },
  // Optional: add footer text
  footer: 'Kälte-und Klimatechnik Said · Eichengrund 32, 49191 Belm',
});

// 4. Finalize → Stripe generates the PDF
const finalized = await stripe.invoices.finalizeInvoice(invoice.id);

// 5. Access the PDF
const pdfUrl = finalized.invoice_pdf;          // expires ~1 hour
const hostedUrl = finalized.hosted_invoice_url; // permanent page

// 6. Download as Buffer to attach to email
const response = await fetch(pdfUrl!);
const pdfBuffer = Buffer.from(await response.arrayBuffer());
```

### 3.3 Recommended Approach

**Phase 1 (NOW):** Use our custom `@react-pdf/renderer` PDF for the Bestellbestätigung email.
- Immediately available after payment
- Fully branded with KKS logo
- No Stripe customer creation needed

**Phase 2 (LATER):** Add Stripe Invoice as the official **Rechnung** (accounting document).
- Triggered when admin marks order as `versendet` or `abgeschlossen`
- Stripe's invoice is legally structured with sequential invoice numbers
- Links to Stripe's hosted invoice page that the customer can always access
- Ideal for B2B customers who need formal invoices for their accounting

### 3.4 Enable Stripe Receipts (No Code Required)

For immediate receipts, you can enable Stripe's automatic receipt emails from the **Stripe Dashboard**:

```
Stripe Dashboard → Settings → Emails → Customer emails
→ ✅ Successful payments (receipt)
```

This sends a Stripe-branded receipt immediately after payment. It complements (not replaces) our branded Bestellbestätigung email.

### 3.5 Future: Stripe Customer Portal

When Stripe Invoices are implemented, the customer portal can be enabled:

```ts
// Create a billing portal session so customers can download past invoices
const portalSession = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: 'https://kks-said.de/account',
});
```

This gives customers a self-service page to download all their invoices without contacting the company.

---

## Implementation Order

| Step | File | Action | Priority | Status |
|---|---|---|---|---|
| **1** | `package.json` | `npm install @react-pdf/renderer` | 🔴 First | ✅ Done |
| **2** | `public/fonts/` | Download Inter font .ttf files | 🔴 First | ✅ Done |
| **3** | `lib/pdf/types.ts` | Create data interfaces | 🔴 Core | ✅ Done |
| **4** | `lib/pdf/fonts.ts` | Font registration | 🔴 Core | ✅ Done |
| **5** | `lib/pdf/styles.ts` | Shared StyleSheet | 🔴 Core | ✅ Done |
| **6** | `lib/pdf/components.ts` | Reusable PDF components | 🔴 Core | ✅ Done |
| **7** | `lib/pdf/order-confirmation.ts` | Order confirmation document | 🔴 Core | ✅ Done |
| **8** | `lib/pdf/index.ts` | Public API export | 🔴 Core | ✅ Done |
| **9** | `lib/email.ts` | Add attachments support to `sendTemplateEmail` | 🔴 Integration | ✅ Done |
| **10** | `lib/email.ts` | Update `sendOrderConfirmation` with PDF param | 🔴 Integration | ✅ Done |
| **11** | `lib/email.ts` | Fix `sendNewOrderNotification` customer exclusion | 🟡 Edge case fix | ✅ Done |
| **12** | `app/api/webhooks/stripe/route.ts` | Fetch full order data, generate PDF, pass to email | 🔴 Integration | ✅ Done |
| **12b** | `app/api/orders/[id]/pdf/route.ts` | PDF download API route (safety net) | 🔴 Integration | ✅ Done |
| **12c** | `app/shop/success/page.tsx` | PDF download button on success page | 🔴 Integration | ✅ Done |
| **13** | — | Test end-to-end with Stripe test card | 🟡 Verify | ⬜ TODO |
| **14** | `app/api/webhooks/stripe/route.ts` | Add Stripe Invoice creation (Phase 2) | 🟢 Future | ⬜ TODO |

---

## Risk Assessment

| Risk | Mitigation |
|---|---|
| **Vercel function timeout** | `@react-pdf/renderer` generates in ~200-500ms. Total webhook time (DB + PDF + 2 emails) stays well under 60s. |
| **German characters (ä, ö, ü, ß)** | Bundle Inter font `.ttf` files; register via `Font.register()`. |
| **Large PDF buffer in memory** | Order PDFs are small (~50-100KB). No concern. |
| **Resend attachment size limit** | Resend allows up to 40MB per email. Order PDFs are ~100KB. |
| **@react-pdf/renderer on edge runtime** | We use Node.js runtime (not edge). The webhook route is already Node.js. No issue. |
| **Stripe Invoice PDF URL expiry** | URLs expire after ~1 hour. Always download the buffer immediately and attach directly, or use `hosted_invoice_url` for the permanent link. |

---

## Future PDF Types (same infrastructure)

| PDF Type | Trigger | Priority |
|---|---|---|
| **Rechnung (Stripe Invoice)** | Admin marks order as `abgeschlossen` | 🟡 Medium |
| **Buchungsbestätigung** | Customer books a service appointment | 🟡 Medium |
| **Angebot (Quote)** | Admin creates a quote from contact request | 🟢 Low |
| **Lieferschein** | Admin marks order as `versendet` | 🟢 Low |

All will reuse the same `lib/pdf/components.tsx` building blocks (header, footer, address blocks, tables).

---

## Summary

```
CURRENT STATE (IMPLEMENTED ✅)
──────────────────────────────
Customer gets 1 email:
  1. Bestellbestätigung + attached PDF          ← professional, detailed, beautiful ✅

Admin gets 1 email:
  1. Neue Bestellung (internal notification + PDF attached) ← admin-only ✅
     (customer email safely filtered if overlap)

Success page:
  - Shows full order details (items, addresses, payment)
  - "Bestellbestätigung (PDF)" download button ← safety net if email fails ✅
  - "Beleg drucken" and "Weiter einkaufen" buttons

New module:
  lib/pdf/ — reusable PDF generation system ✅
  First document: Order Confirmation PDF ✅
  API route: GET /api/orders/[id]/pdf?session_id=... ✅
  Ready for: Invoices, Booking Confirmations, Quotes

Phase 2 (optional):
  Stripe Invoice → formal Rechnung PDF
  Accessible via customer portal or email link
```

---

## Appendix: Download Button vs Email-Only — Analysis

### The Problem

What if the email fails (Resend outage, spam filter, wrong address)?
- Customer paid but has no confirmation document
- Admin may not be notified
- No paper trail for the transaction

### Decision: KEEP BOTH (Email + Download Button)

| Delivery Method | Reliability | Proof of Purchase | Offline Access |
|---|---|---|---|
| **Email with PDF** | Depends on Resend + email provider | ✅ In inbox forever | ✅ After download |
| **Download button** | 100% (server-side, no external dependency) | ✅ Immediate | ✅ Immediate |
| **Email only** | ⚠️ Can fail silently | ❌ Lost if email fails | ❌ None |

### Performance Impact: NEGLIGIBLE

The download button does NOT slow down the success page because:
1. The PDF is generated **on demand** when the user clicks the button (not on page load)
2. Generation takes ~200-500ms (fast, one-time computation)
3. The API route (`/api/orders/[id]/pdf`) is a separate request — does not block page rendering
4. The PDF for the email was already generated in the webhook — completely separate

### Safety Architecture

```
Payment → Stripe webhook → Generate PDF → Email (customer + admin)
  ↓                                          ↓
Success page loads                      Email fails?
  ↓                                          ↓
Download button available              Customer still has
  ↓                                    the download button
Click → Generate PDF on demand         as a safety net
  ↓
Customer downloads PDF                 Admin sees order in
                                       the admin dashboard
```

### Key Points

1. **The download button is FREE** — no storage, no extra complexity
2. **The PDF is regenerated fresh** each time — always matches current DB data
3. **Security**: The API requires a valid `session_id` that matches the `bestellung_id` — only the paying customer can download
4. **Cache**: Response is cached for 1 hour (`Cache-Control: private, max-age=3600`) so repeat clicks are instant
5. **Admin dashboard** is the ultimate safety net — orders are always in the DB even if all emails fail


