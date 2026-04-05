# Stripe Payment Methods & Checkout Configuration
> Status: **REFERENCE + ACTION ITEMS**  
> Created: 2026-04-04  
> Author: GitHub Copilot

---

## 1. Activated Payment Methods (9 of 32)

From the Stripe Dashboard → Zahlungen → Zahlungsmethoden:

| Method | Type | Region | Status | Shows in Checkout? |
|---|---|---|---|---|
| **Karten** (Visa, MC, Amex) | Karten | Alle Regionen | ✅ Aktiviert | ✅ Yes |
| **Cartes Bancaires** | Karten | Frankreich | ✅ Aktiviert | ✅ Yes (France only) |
| **PayPal** | Wallet | Alle Regionen | ✅ Aktiviert | ✅ Yes |
| **Google Pay** | Wallet | Alle Regionen | ✅ Aktiviert | ✅ Yes (device-dependent) |
| **Amazon Pay** | Wallet | Alle Regionen | ✅ Aktiviert | ✅ Yes |
| **Link** | Wallet | Alle Regionen | ✅ Aktiviert | ✅ Yes (auto-fills) |
| **Revolut Pay** | Wallet | Europa, UK | ✅ Aktiviert | ✅ Yes |
| **Klarna** | Jetzt kaufen, später zahlen | Alle Regionen | ✅ Aktiviert | ✅ Yes |
| **Banküberweisung** | Banküberweisungen | EU, UK, JP, MX, US | ✅ Aktiviert | ⚠️ See below |

---

## 2. Why Banküberweisung Does NOT Appear in Checkout

### Short Answer
Banküberweisung (bank transfer) is **NOT compatible with Stripe Checkout Sessions in `payment` mode**. It only works with **Stripe Invoices** or **Payment Intents** with delayed confirmation.

### Technical Explanation

Bank transfers are **asynchronous** — the customer doesn't pay instantly. The flow is:

1. Customer selects "Banküberweisung"
2. Stripe generates a virtual bank account (IBAN + reference code)
3. Customer transfers money from their bank (takes 1-5 business days)
4. Stripe matches the transfer and completes the payment

This is fundamentally incompatible with the Checkout Session `mode: 'payment'` flow which expects **instant payment completion** before redirecting to the success URL.

### How to Enable Banküberweisung

There are two options:

#### Option A: Stripe Invoices (Recommended for B2B)
```
Admin creates invoice → Stripe emails invoice to customer → 
Customer can choose Banküberweisung on the invoice payment page →
Transfer arrives → Stripe auto-matches → Invoice marked as paid
```
This uses the **Stripe Invoice system** we already planned in `ORDER_PDF_AND_RECHNUNG_PLAN.md`.

#### Option B: Payment Intents with `payment_method_types: ['customer_balance']`
More complex, requires building a custom payment flow. NOT recommended for this project.

### Recommendation
**Keep Banküberweisung activated** in the Dashboard — it will become available when we implement Stripe Invoices (Phase 2). For now, the Checkout page correctly hides it because it's not supported in `mode: 'payment'`.

---

## 3. Domain Configuration

### Current Setup
From Stripe Dashboard → Zahlungen → Zahlungsmethoden-Domains:

| Domain | Status | Domain-ID |
|---|---|---|
| `checkout.stripe.com` | ✅ Aktiviert | `pmd_1TGfCe...` |

### Is This Correct?
**Yes, for Hosted Checkout (redirect mode).** Since we use `stripe.checkout.sessions.create()` which redirects to `checkout.stripe.com`, this is the correct and only domain needed.

### When to Add Custom Domain
If you want Apple Pay or Google Pay to work on **your own domain** (e.g., for Embedded Checkout or Stripe Elements), you'd need to register `kks-said.de` as a payment method domain. But since we use Hosted Checkout, this is **not needed**.

### For Production (Live Mode)
When switching to live mode, the `checkout.stripe.com` domain is automatically registered. No manual action needed.

---

## 4. Product Images & Descriptions in Checkout ✅ IMPLEMENTED

Stripe Checkout Sessions support product images via `product_data.images` and detailed descriptions via `product_data.description`. We now pass both to Stripe so the checkout page matches the Warenkorb's detail level.

### How It Works — Images
```
artikel → artikel_bilder (ordered by anzeige_reihenfolge) → medien_dateien.speicherpfad
    ↓
Resolve to full URL: ${SUPABASE_URL}/storage/v1/object/public/product-images/${speicherpfad}
    ↓
Pass to Stripe: product_data.images: [imageUrl]
```

### How It Works — Description
Each line item's `product_data.description` shows only the **article number** (Art.-Nr.) when available. Other details are intentionally omitted to avoid redundancy:
- **Variant name** is already in the product `name` (e.g. "Mercedes – 50 Meter")
- **Unit price** is shown natively by Stripe (e.g. "je 137,10 €" for multi-quantity)

Example: `Art.-Nr.: 0123132135`

### Stripe Requirements for Images
- Must be a publicly accessible HTTPS URL
- Recommended size: 300×300px minimum
- Supported formats: PNG, JPG, GIF
- Maximum 8 images per line item
- We pass only the **first** (primary) image per product

---

## Summary

| Item | Status | Action |
|---|---|---|
| Payment methods domain | ✅ Correct | No action needed |
| Banküberweisung in checkout | ✅ Fixed | Now works — Stripe Customer passed to session (see STRIPE_BANK_ISSUE.md) |
| Product images in checkout | ✅ Implemented | Images now show on Stripe Checkout page |
| Product descriptions in checkout | ✅ Implemented | Art.-Nr., Variante & Stückpreis shown |
| All other methods working | ✅ Confirmed | Karte, PayPal, Klarna, Amazon Pay, Revolut Pay, Google Pay, Link |

