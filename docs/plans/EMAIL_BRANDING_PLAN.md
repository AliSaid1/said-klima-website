# E-Mail Branding & Automation Plan
> Status: **✅ LARGELY COMPLETE — minor items outstanding**  
> Created: 2026-04-04 | Last Updated: 2026-04-04  
> Author: GitHub Copilot  

---

## 1. Current State

### What already exists

| Component | Status | Notes |
|---|---|---|
| `lib/resend.ts` | ✅ Done | Resend client singleton |
| `lib/email.ts` | ✅ Done | `emailWrapper()`, `sendTemplateEmail()`, `sendOrderConfirmation()`, `sendBookingConfirmation()`, `sendBookingStatusEmail()`, `sendNewBookingNotification()`, `sendNewOrderNotification()`, `sendContactEmails()` |
| `lib/branding.ts` | ✅ Done | `COMPANY_NAME`, `LOGO_SRC`, `COMPANY_EMAIL_FROM`, `COMPANY_EMAIL_REPLY_TO`, `COMPANY_DOMAIN`, `COMPANY_PHONE`, `COMPANY_ADDRESS`, `COMPANY_LOGO_EMAIL`, `COMPANY_WEBSITE` |
| `email_vorlagen` DB table | ✅ Done | 5 base templates + 3 new ones via migration `018` |
| Admin template editor | ✅ Done | `/admin/email-templates` — list + edit + preview + all new type labels |
| Stripe webhook → customer email | ✅ Done | `sendOrderConfirmation()` called after `checkout.session.completed` |
| Contact form UI | ✅ Done | `app/contact/page.tsx` — full form with Angebot fields |
| Contact form API | ✅ Done | `app/api/contact/route.ts` — validates, rate-limits, sends both emails |
| Contact form wired | ✅ Done | `app/contact/page.tsx` uses `fetch('/api/contact', ...)` |
| Admin order notification | ✅ Done | `sendNewOrderNotification()` called from Stripe webhook — company notified on every order |
| Branded email template | ✅ Done | `emailWrapper()` has KKS logo, company details footer, legal disclaimer |
| `from` address | ✅ Done | Uses `COMPANY_EMAIL_FROM` = `noreply@mail.kks-said.de` |
| New email templates (DB) | ✅ Done | Migration `018_email_vorlagen_kontakt_order.sql` adds `kontakt_anfrage_intern`, `kontakt_anfrage_bestaetigung`, `bestellung_admin_benachrichtigung` |
| Admin template editor labels | ✅ Done | All 3 new types added to `typLabels` in `/admin/email-templates/page.tsx` |

### Email infrastructure

| Service | Domain | Purpose |
|---|---|---|
| **Resend** | `mail.kks-said.de` | Transactional emails (orders, bookings, contact) |
| **Supabase Auth** | `mail.kks-said.de` | User auth emails (registration, password reset, magic link) |
| **IONOS** | `kks-said.de` | Main domain — `info@kks-said.de` is the company inbox |

### Send addresses

| Address | Use |
|---|---|
| `noreply@mail.kks-said.de` | Automated transactional emails (FROM address) ✅ |
| `info@kks-said.de` | Company inbox, Reply-To header, admin notifications recipient ✅ |

---

## 2. What Was Implemented

### ✅ 2.1 Upgrade branding constants (`lib/branding.ts`)

Added email-specific constants:
- `COMPANY_EMAIL_FROM` = `noreply@mail.kks-said.de`
- `COMPANY_EMAIL_REPLY_TO` = `info@kks-said.de`
- `COMPANY_DOMAIN` = `kks-said.de`
- `COMPANY_PHONE` = `+49 176 80140769`
- `COMPANY_ADDRESS` = `Eichengrund 32, 49191 Belm`
- `COMPANY_LOGO_URL` = `https://kks-said.de/images/KKS_LOGO.png`

### ✅ 2.2 Professional branded `emailWrapper()` (`lib/email.ts`)

Replaced the plain wrapper with:
- **Header**: KKS logo + subtitle "Kälte- & Klimatechnik"
- **Content**: Passed in by each email function
- **Footer**: Full company details — name, address, phone, email, website
- **Legal line**: "Diese E-Mail wurde automatisch versendet. Bitte antworten Sie nicht direkt auf diese E-Mail."
- **From address**: `KÄLTE-UND KLIMATECHNIK SAID <noreply@mail.kks-said.de>`
- **Reply-To**: `info@kks-said.de`

### ✅ 2.3 Contact form API (`app/api/contact/route.ts`)

Created `POST /api/contact` that:
1. Validates + sanitizes all inputs
2. Rate-limits (5 requests per 10 min per IP)
3. Sends **Email A → Company** (`info@kks-said.de`): Internal notification with all form data
4. Sends **Email B → Customer**: Confirmation ("Wir haben Ihre Anfrage erhalten")
5. Returns success/error JSON

### ✅ 2.4 Wire contact form to API (`app/contact/page.tsx`)

Replaced `setTimeout` simulation with `fetch('/api/contact', ...)`.

### ✅ 2.5 Admin order notification (`lib/email.ts` + webhook)

`sendNewOrderNotification()` implemented:
- Emails `info@kks-said.de` + all DB admin users
- Contains: Bestellnummer, Gesamtbetrag, Kundenname, Lieferadresse, line items table
- Called from `app/api/webhooks/stripe/route.ts` after `sendOrderConfirmation()`

> **Note:** Admin notifications are correct behavior. The admin MUST be notified on every order.

### ✅ 2.6 New email templates (DB migration)

Migration `018_email_vorlagen_kontakt_order.sql` adds:
- `kontakt_anfrage_intern` — internal notification to company
- `kontakt_anfrage_bestaetigung` — customer confirmation for Kontakt/Angebot
- `bestellung_admin_benachrichtigung` — new order notification to company

### ✅ 2.7 Admin template editor labels

Added all 3 new template types to `typLabels` in `app/admin/email-templates/page.tsx`.

---

## 3. File Changes Summary

| Action | File | Priority | Status |
|---|---|---|---|
| **Updated** | `lib/branding.ts` — added all email constants | 🔴 High | ✅ Done |
| **Updated** | `lib/email.ts` — branded wrapper, correct `from`, `sendNewOrderNotification()`, `sendContactEmails()` | 🔴 High | ✅ Done |
| **Created** | `app/api/contact/route.ts` — contact form API | 🔴 High | ✅ Done |
| **Updated** | `app/contact/page.tsx` — wired to real API | 🔴 High | ✅ Done |
| **Updated** | `app/api/webhooks/stripe/route.ts` — admin order notification integrated | 🟡 Medium | ✅ Done |
| **Created** | `supabase/migrations/018_email_vorlagen_kontakt_order.sql` | 🟡 Medium | ✅ Done |
| **Updated** | `app/admin/email-templates/page.tsx` — 3 new type labels added | 🟢 Low | ✅ Done |
| **Update** | `.env.example` — document new env vars | 🟢 Low | ⬜ Outstanding |

---

## 4. Logo in Emails

Email clients cannot load images from `localhost`. The logo must be accessible via a public URL.

**Option A (in use ✅):** Deployed Vercel URL:
```
https://kks-said.de/images/KKS_LOGO.png
```

**Option B (fallback):** Base64 data URI (increases email size but works offline).

We use Option A via `COMPANY_LOGO_EMAIL` constant in `lib/branding.ts`.

---

## 5. Supabase Auth Email Templates (separate — outstanding)

Supabase Auth templates (registration, password reset, magic link) are configured in:
**Supabase Dashboard → Authentication → Email Templates**

These are NOT part of the `email_vorlagen` table. They should be updated manually in the dashboard to match the same branded look.

| Template | Status |
|---|---|
| Registration / Confirm email | ⬜ Not yet updated in Supabase Dashboard |
| Password reset | ⬜ Not yet updated in Supabase Dashboard |
| Magic link | ⬜ Not yet updated in Supabase Dashboard |

Draft HTML for those can be provided separately.

---

## 6. Future: `anfragen` Table

Currently the contact form data is only sent via email (no DB persistence). A future improvement would be:
- Create `anfragen` table in Supabase
- Store all contact/Angebot inquiries
- Add an admin page `/admin/anfragen` to view them
- This is NOT part of the current implementation.

---

## 7. Outstanding Items

| Item | Priority | Status |
|---|---|---|
| Update `.env.example` with all new env vars | 🟢 Low | ⬜ Outstanding |
| Update Supabase Auth email templates in the Dashboard (branding) | 🟡 Medium | ⬜ Outstanding |
| PDF attachment for Bestellbestätigung (see `ORDER_PDF_AND_RECHNUNG_PLAN.md`) | 🔴 High | ✅ Done |
| Edge case fix: exclude customer from admin order notification | 🟡 Medium | ✅ Done |
