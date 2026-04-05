# Stripe Dashboard Features & Configuration Guide
> Status: **REFERENCE DOCUMENT**  
> Created: 2026-04-04  
> Author: GitHub Copilot  
> Stripe Account: **KKS Sandbox** (Test/Sandbox mode)

---

## Overview

This document explains the Stripe Dashboard features currently configured for the KKS project, based on the Sandbox account screenshots. Each section covers what the feature is, the current configuration, and how it can be utilized in the project.

> ⚠️ **Important:** All settings shown are in **Sandbox** (test mode). Before going live, the same settings must be configured in the **Live-Konto** (production account). Sandbox changes do NOT affect the live account.

---

## 1. Checkout-Design (Checkout Branding)

**Location:** `Stripe Dashboard → Einstellungen → Branding → Checkout-Design`

### What It Is

This controls the visual appearance of the **Stripe Hosted Checkout page** — the page customers see when they are redirected from your shop to pay. Since the project uses **redirect mode** (hosted checkout, not embedded), this is the page every paying customer will see.

### Current Configuration

| Setting | Value | Notes |
|---|---|---|
| **Modus** | Von Stripe gehostet | ✅ Correct — matches our redirect checkout |
| **Hintergrund (Background)** | `#ffffff` (white) | Clean, professional look |
| **Schaltfläche (Button)** | `#0074d4` (blue) | Matches KKS brand blue |
| **Schriftart** | Systemschriftart (Standard) | Uses the customer's system font |
| **Formen (Shapes)** | Abgerundet (Rounded) | Modern, soft UI corners |
| **Markenfarben verwenden** | Disabled | Could be enabled to auto-apply brand colors |

### How to Utilize

1. **Enable "Markenfarben verwenden"** — This auto-applies your brand color to all Stripe-hosted pages consistently, not just checkout.

2. **Consider custom font** — If you want the checkout to feel more on-brand, you can select a custom font (e.g., Inter, which is used in the website). However, system font is fine and loads faster.

3. **Add your logo** — The checkout preview shows no logo on the payment form. The logo from Marken-Elemente (see §2) should appear here. Make sure the logo is set in the main Branding → Marken-Elemente section.

4. **Test the real experience** — Use `4242 4242 4242 4242` test card. Check that the redirect page looks professional and matches your brand. The customer sees:
   - Product name + price
   - Email input
   - Card payment form with your brand color on the "Zahlen" button

### Production Checklist

- [ ] Verify same branding settings are applied in **Live-Konto**
- [ ] Consider enabling "Markenfarben verwenden" for consistency
- [ ] Test checkout flow with a real device (mobile + desktop)

---

## 2. Marken-Elemente (Brand Elements)

**Location:** `Stripe Dashboard → Einstellungen → Branding → Marken-Elemente`

### What It Is

This is the **central branding configuration** for ALL Stripe-hosted surfaces — checkout, invoices, receipts, customer portal, payment links, and emails. Any logo, color, or icon you set here is inherited by all Stripe products.

### Current Configuration

| Setting | Value | Notes |
|---|---|---|
| **Symbol (Icon)** | KKS icon (blue snowflake mark) | Small square icon — used in tabs, favicons, compact views |
| **Logo** | KKS full logo (snowflake + "KÄLTE-UND KLIMATECHNIK SAID" text) | Full logo — used in invoices, receipts, checkout header |
| **Logo dem Symbol vorziehen** | Disabled | When enabled, uses the full logo instead of the icon in compact views |
| **Markenfarbe** | `#4071f7` (primary blue) | Applied to headers, accents across all Stripe pages |
| **Akzentfarbe** | `#0074cd` (darker blue) | Used for buttons, links, interactive elements |

### How to Utilize

1. **Both logo and icon are set** ✅ — This means Stripe will show the appropriate one depending on context:
   - **Icon** → Checkout tab favicon, compact email headers, mobile views
   - **Logo** → Invoice PDF header, receipt emails, customer portal

2. **Consider enabling "Logo dem Symbol vorziehen"** — If you want the full company name visible in more places (e.g., checkout page header), enable this toggle. It makes the full "KÄLTE-UND KLIMATECHNIK SAID" logo appear instead of just the snowflake icon.

3. **Color consistency** — The brand color `#4071f7` and accent `#0074cd` are close but slightly different. The checkout button uses `#0074d4`. Consider aligning all three to the same blue for perfect consistency:
   - Option A: Use `#0074cd` everywhere (darker, more professional)
   - Option B: Use `#2563EB` everywhere (matches the website's Tailwind `blue-600`)

### Production Checklist

- [ ] Upload the same Symbol and Logo in the Live-Konto
- [ ] Align brand colors across Checkout-Design and Marken-Elemente
- [ ] Decide whether to enable "Logo dem Symbol vorziehen"

---

## 3. Rechnung / Invoice Branding (Payment Page + PDF)

**Location:** `Stripe Dashboard → Einstellungen → Branding → Rechnung`

### What It Is

This controls how **Stripe-generated invoices** look — both the online **Bezahlseite** (payment page) that customers see when they click an invoice link, and the **PDF** that can be downloaded or attached to emails.

### Current Configuration

Two views are available:

#### 3a. Bezahlseite (Online Payment Page)

The hosted page a customer sees when they receive an invoice link. Shows:
- KKS logo + "KKS Sandbox" name
- Amount due (e.g., 5.000,00 $)
- Due date (Fällig am 11. April 2026)
- Customer details (An: Example Name, Von: KKS Sandbox, Rechnung: #TEST-01234)
- "Rechnungsdetails anzeigen" expandable section
- Integrated card payment form with "Zahlen" button

#### 3b. PDF Preview

The downloadable invoice PDF. Shows:
- **Header:** "Rechnung" title + KKS logo (top right)
- **Invoice details:** Rechnungsnummer (EXAMPLE-0001), Ausstellungsdatum, Fällig am
- **Parties:** Company (KKS Sandbox, Deutschland) | Rechnungsempfänger (Beispielkund/in)
- **Line items table:** Beschreibung | Menge | Preis pro Einheit | Betrag
- **Totals:** Zwischensumme, Summe, Fälliger Betrag

### How to Utilize in the Project

This is directly relevant to **Task 3 (Stripe Rechnung)** in the `ORDER_PDF_AND_RECHNUNG_PLAN.md`:

1. **The branding is already configured** — When we create Stripe Invoices via the API, they will automatically use the KKS logo, colors, and company name from this branding configuration.

2. **Two PDF strategies — they complement each other:**

   | PDF | Source | Purpose | When |
   |---|---|---|---|
   | **Bestellbestätigung PDF** | `@react-pdf/renderer` (our code) | Detailed order confirmation with all items | Immediately after payment |
   | **Rechnung PDF** | Stripe Invoice API | Official invoice for accounting | After fulfillment / on demand |

3. **API integration** — When creating invoices via `stripe.invoices.create()`, the branding from this page is applied automatically. No additional code needed for styling.

4. **Company details** — The PDF currently shows "KKS Sandbox" and "Deutschland". In production:
   - Update **Stripe Dashboard → Einstellungen → Unternehmensdaten** with:
     - Full company name: `Kälte-und Klimatechnik Said`
     - Address: `Eichengrund 32, 49191 Belm, Deutschland`
     - Tax ID / USt-IdNr if applicable
   - These details will then appear on every generated invoice PDF automatically.

5. **Invoice numbering** — Stripe auto-generates sequential invoice numbers (e.g., `EXAMPLE-0001`, `EXAMPLE-0002`). You can customize the prefix in:
   ```
   Stripe Dashboard → Einstellungen → Billing → Rechnungen → Rechnungsnummer-Präfix
   ```
   Recommended prefix: `KKS-` → produces `KKS-0001`, `KKS-0002`, etc.

### Production Checklist

- [ ] Update company name from "KKS Sandbox" to full legal name in Live-Konto
- [ ] Add full company address in Unternehmensdaten
- [ ] Add Tax ID / USt-IdNr in Steuerdetails
- [ ] Set invoice number prefix to `KKS-`
- [ ] Verify PDF looks correct with real data

---

## 4. Global Payouts Email Branding

**Location:** `Stripe Dashboard → Einstellungen → Branding → Global Payouts`

### What It Is

This controls the appearance of **payout emails** — emails Stripe sends when money is transferred to connected accounts or when using Stripe Connect / Payouts features. The preview shows:

- **From:** Stripe
- **Subject:** "KKS Sandbox hat Ihnen 100,00 € geschickt"
- **Body:** KKS Sandbox branding, "Geld annehmen" button
- **Support contact:** ali.y.said1996@gmail.com

### Current Configuration

| Setting | Value |
|---|---|
| **Sender** | Stripe (cannot be changed for payouts) |
| **Company name in email** | KKS Sandbox |
| **Support email shown** | ali.y.said1996@gmail.com |
| **Brand elements** | Uses Symbol, Logo, colors from Marken-Elemente |

### How to Utilize

1. **Currently NOT relevant for the project** — Global Payouts is primarily used for:
   - Stripe Connect (marketplace payouts to sellers)
   - Stripe Issuing (sending funds to cardholders)
   - The KKS project does not use Connect or Issuing

2. **Support email** — The email shown (`ali.y.said1996@gmail.com`) is pulled from the account's public business profile. For production:
   - Change to `info@kks-said.de` in:
     ```
     Stripe Dashboard → Einstellungen → Unternehmensdaten → Öffentliche Angaben → Support-E-Mail
     ```
   - This email appears in all Stripe-hosted pages and emails as the support contact

3. **Future use** — If you ever add a marketplace feature (e.g., other Klimatechnik companies selling through your platform), this branding would apply to their payout notifications.

### Production Checklist

- [ ] Update Support-E-Mail from `ali.y.said1996@gmail.com` to `info@kks-said.de`
- [ ] No other action needed unless using Stripe Connect

---

## 5. Kunden-E-Mails (Customer Emails)

**Location:** `Stripe Dashboard → Einstellungen → Unternehmen → Kunden-E-Mails`

### What It Is

This controls which **automatic emails Stripe sends directly to customers** — independent of your own email system (Resend). These are Stripe-branded emails sent from Stripe's servers.

### Current Configuration

| Setting | Status | Description |
|---|---|---|
| **Standardsprache** | Deutsch ✅ | All Stripe emails sent in German |
| **Erfolgreiche Zahlungen** | 🔵 ON | Stripe sends a receipt after every successful payment |
| **Rückerstattungen** | 🔵 ON | Stripe sends a notification when a refund is processed |
| **SEPA Lastschrift** | ⚪ OFF | Not needed (using card payments) |
| **Canada PAD / BECS / etc.** | ⚪ OFF | Not needed (European market only) |
| **Multibanco / Banküberweisungen** | ⚪ OFF | Not needed currently |
| **Support-E-Mail** | ali.y.said1996@gmail.com | Shown in Stripe emails as support contact |

### How to Utilize

1. **"Erfolgreiche Zahlungen" is ON** ✅ — This means after every successful checkout, the customer receives **TWO emails**:
   - **Email 1:** Your custom Bestellbestätigung (from Resend via `sendOrderConfirmation()`)
   - **Email 2:** Stripe's automatic receipt (from Stripe directly)
   
   **Decision needed:** Is this desired?
   
   | Option | Pros | Cons |
   |---|---|---|
   | **Keep both ON** | Customer has a Stripe receipt for disputes/chargebacks + your branded confirmation | Customer gets 2 emails which may be confusing |
   | **Turn OFF Stripe receipt** | Customer only gets your branded email (cleaner experience) | No automatic Stripe receipt (but you can attach a PDF instead) |
   
   **Recommendation:** Once the PDF attachment is implemented in the Bestellbestätigung email, consider **turning OFF** "Erfolgreiche Zahlungen" in Stripe to avoid double-emailing. Your PDF will be more detailed and branded than Stripe's generic receipt.

2. **"Rückerstattungen" is ON** ✅ — Keep this ON. When you issue a refund from the Stripe Dashboard or via API, the customer is automatically notified. This is important for trust and transparency. You don't need to build refund emails yourself.

3. **Important note about `receipt_email`** — The yellow warning text says:
   > "Diese Einstellung wird ignoriert, wenn Sie eine Zahlung in der API erstellen und den Parameter receipt_email angeben."
   
   This means if your checkout code explicitly sets `receipt_email` on the payment intent, Stripe ALWAYS sends a receipt regardless of this toggle. Check your checkout route:

   ```ts
   // If this exists in app/api/checkout/route.ts, Stripe sends receipts regardless:
   receipt_email: customerEmail  // ← remove this if you want to control via Dashboard toggle
   ```

4. **Sprache: Deutsch** ✅ — All Stripe-sent emails (receipts, refund notifications, invoice emails) will be in German. Perfect for the German customer base.

### Production Checklist

- [ ] Decide: Keep or disable "Erfolgreiche Zahlungen" (see recommendation above)
- [ ] Keep "Rückerstattungen" ON
- [ ] Update Support-E-Mail from `ali.y.said1996@gmail.com` → `info@kks-said.de`
- [ ] Verify same settings in Live-Konto
- [ ] Check if `receipt_email` is set in checkout API route (if yes, consider removing)

---

## 6. Nutzerspezifische Domains (Custom Domains)

**Location:** `Stripe Dashboard → Einstellungen → Unternehmen → Nutzerspezifische Domains`

### What It Is

This controls which **domain names** appear in the URL bar when customers interact with Stripe-hosted pages. By default, Stripe uses its own domains. You can optionally add your own domain for a more branded experience.

### Current Configuration

| Product | Current Domain | Custom Domain Possible |
|---|---|---|
| **Checkout** | `checkout.stripe.com` | ✅ Yes |
| **Payment Links** | `buy.stripe.com` | ✅ Yes |
| **Kundenportal (Billing)** | `billing.stripe.com` | ✅ Yes |

All three are using **Stripe's default domains** — no custom domain has been added.

### How to Utilize

1. **Custom domain for Checkout** — Instead of the customer seeing `checkout.stripe.com` in their browser, they could see `pay.kks-said.de` or `checkout.kks-said.de`. This:
   - Increases trust (customer stays "on your domain")
   - Looks more professional
   - Reduces phishing concerns ("Why am I on stripe.com?")

2. **Setup process:**
   ```
   1. Click "Domain hinzufügen"
   2. Enter: pay.kks-said.de (or checkout.kks-said.de)
   3. Stripe gives you a CNAME record to add to your DNS
   4. Add the CNAME in IONOS DNS settings for kks-said.de
   5. Stripe verifies the DNS → domain is active
   ```

3. **DNS record example:**
   ```
   Type:  CNAME
   Name:  pay (or checkout)
   Value: hosted-checkout.stripecdn.com  (Stripe provides exact value)
   TTL:   3600
   ```

4. **Priority assessment:**

   | Priority | Reasoning |
   |---|---|
   | 🟢 **Low (Nice-to-have)** | The default `checkout.stripe.com` is well-known and trusted. Most customers recognize it. A custom domain is a polish feature, not essential. |

5. **Kundenportal domain** — If you implement the Stripe Customer Portal (for customers to view/download their invoices), `billing.stripe.com` can also be customized to `billing.kks-said.de` or `konto.kks-said.de`.

### Production Checklist

- [ ] **Optional:** Add `pay.kks-said.de` as custom Checkout domain
- [ ] **Optional:** Add `billing.kks-said.de` as custom Portal domain  
- [ ] If adding custom domains: configure DNS CNAME records in IONOS
- [ ] This is low priority — can be done later after core features are complete

---

## Summary: Quick Action Items

### Must Do (Before Going Live)

| # | Action | Where |
|---|---|---|
| 1 | Change Support-E-Mail from `ali.y.said1996@gmail.com` → `info@kks-said.de` | Unternehmensdaten → Öffentliche Angaben |
| 2 | Add full company address | Unternehmensdaten |
| 3 | Add Tax ID / USt-IdNr | Steuerdetails |
| 4 | Replicate all Sandbox branding settings in Live-Konto | Branding (all tabs) |
| 5 | Replicate Kunden-E-Mails settings in Live-Konto | Kunden-E-Mails |

### Should Do (Recommended)

| # | Action | Where |
|---|---|---|
| 6 | Align all brand colors (checkout button, Markenfarbe, Akzentfarbe) | Branding → all tabs |
| 7 | Set invoice number prefix to `KKS-` | Billing → Rechnungen |
| 8 | Decide on Stripe receipt emails (keep ON or OFF after PDF is built) | Kunden-E-Mails |
| 9 | Consider enabling "Logo dem Symbol vorziehen" | Marken-Elemente |

### Nice to Have (Future Polish)

| # | Action | Where |
|---|---|---|
| 10 | Add custom domain `pay.kks-said.de` for checkout | Nutzerspezifische Domains |
| 11 | Add custom domain `billing.kks-said.de` for customer portal | Nutzerspezifische Domains |
| 12 | Enable Stripe Customer Portal for self-service invoice access | Billing settings + API |

---

## How These Features Connect to Our Code

```
┌─────────────────────────────────────────────────────────────────┐
│                        Customer Journey                          │
│                                                                   │
│  1. Customer clicks "Zur Kasse" on kks-said.de                   │
│     ↓                                                             │
│  2. POST /api/checkout → creates Stripe Checkout Session          │
│     ↓                                                             │
│  3. Redirect to checkout.stripe.com (§1 Checkout-Design applies) │
│     - KKS logo (§2 Marken-Elemente)                              │
│     - Brand colors (#0074d4 button)                               │
│     - Rounded corners, system font                                │
│     ↓                                                             │
│  4. Customer pays with test card 4242...                          │
│     ↓                                                             │
│  5. Stripe fires checkout.session.completed webhook               │
│     ↓                                                             │
│  6. Our webhook (app/api/webhooks/stripe/route.ts):               │
│     a. Updates order → 'bezahlt'                                  │
│     b. Sends Bestellbestätigung email (Resend) ← OUR email       │
│     c. Sends admin notification (Resend) ← OUR email             │
│     ↓                                                             │
│  7. Stripe sends automatic receipt email (§5 Kunden-E-Mails)     │
│     ← STRIPE's email (if "Erfolgreiche Zahlungen" is ON)         │
│     ↓                                                             │
│  8. Customer redirected to /shop/success                          │
│                                                                   │
│  FUTURE:                                                          │
│  9. Admin creates Stripe Invoice (§3 Rechnung branding applies)  │
│  10. Customer accesses billing.stripe.com portal (§6 Domains)    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Related Plan Documents

- [`ORDER_PDF_AND_RECHNUNG_PLAN.md`](./ORDER_PDF_AND_RECHNUNG_PLAN.md) — PDF generation system + Stripe Invoice API integration
- [`EMAIL_BRANDING_PLAN.md`](./EMAIL_BRANDING_PLAN.md) — Email branding via Resend (our custom emails)
- [`STRIPE_CHECKOUT_PLAN.md`](./STRIPE_CHECKOUT_PLAN.md) — Stripe checkout flow, webhook, local testing

