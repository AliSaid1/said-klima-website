# 🚀 Go-Live Checklist

Production launch checklist for the **KÄLTE- UND KLIMATECHNIK SAID** platform
(Next.js 15 · Supabase · Stripe · Resend, deployed on Vercel).

Work top to bottom. Nothing here contains secrets — fill real values only in the
**Vercel dashboard** (Project → Settings → Environment Variables), never in the repo.

---

## 1. Stripe — switch from test to live

- [ ] Activate the Stripe account (business details + bank account) so **Live mode** is enabled.
- [ ] Copy the **live** API keys (Dashboard → Developers → API keys) into Vercel:
  - [ ] `STRIPE_SECRET_KEY` = `sk_live_…`
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_…`
- [ ] Create a **live** webhook endpoint (Dashboard → Developers → Webhooks → Add endpoint):
  - URL: `https://<your-domain>/api/webhooks/stripe`
  - Event: `checkout.session.completed`
  - [ ] Copy that endpoint's signing secret into Vercel `STRIPE_WEBHOOK_SECRET` = `whsec_…`
- [ ] Verify the webhook is **not** still pointing at a test/old value (this exact mismatch
      silently blocks the order-confirmation email).

> ℹ️ `stripe listen` is for **local dev only**. In production the Dashboard webhook endpoint
> above is what delivers events. The order-confirmation email is sent **only** by this webhook,
> not by the success page (which just offers the PDF download).

---

## 2. Supabase — use the production project

- [ ] Confirm Vercel points at the **production** Supabase project, **not** the CI/test
      project used for E2E seeding.
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (server-only — never exposed to the browser)
- [ ] All migrations applied to the prod DB (`npm run migrate` against the prod `DATABASE_URL`).
- [ ] Row Level Security (RLS) policies enabled and verified on all tables.
- [ ] Confirm the `email_vorlagen` templates exist (esp. `bestellung_bestaetigung`,
      `buchung_bestaetigung`, booking reminder). *Even if one is missing, the inline
      fallback in `lib/email.ts` now still sends — but real templates are preferred.*
- [ ] Point-in-time recovery / scheduled backups enabled.

---

## 3. Resend — deliverable, branded email

- [ ] Verify the sending **domain** in Resend (add SPF + DKIM DNS records).
- [ ] `RESEND_API_KEY` set in Vercel.
- [ ] Confirm the "from" address in `lib/email.ts` uses the verified domain (not a test address).
- [ ] Send a real test order + booking and confirm mail arrives in the **inbox**, not spam.

---

## 4. App configuration (Vercel env)

- [ ] `NEXT_PUBLIC_APP_URL` = `https://<your-domain>` (used for Stripe redirects, email &
      PDF links — a leftover `localhost` value breaks all outgoing links).
- [ ] `CRON_SECRET` set (Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>`;
      without it the booking-reminder cron returns 401 and no reminders go out).
- [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` set (rate limiting;
      degrades gracefully if unset, but recommended in prod).
- [ ] **Do not** set `DISABLE_RATE_LIMIT` in production (it is a CI-only escape hatch).
- [ ] Set env vars for the correct Vercel environment (Production / Preview) as intended.

---

## 5. Domain & hosting

- [ ] Custom domain added in Vercel with automatic SSL (HTTPS) active.
- [ ] `www` → apex (or vice-versa) redirect configured consistently.
- [ ] Cron confirmed in `vercel.json`: `booking-reminders` daily at 08:00.
      (`cleanup-orders` was intentionally removed — abandoned orders are managed
      manually from the admin dashboard.)

---

## 6. Legal (German e-commerce — required)

- [ ] **Impressum** — complete and accurate (company, address, contact, VAT ID if applicable).
- [ ] **Datenschutzerklärung** (privacy policy) — reflects Supabase, Stripe, Resend, Upstash.
- [ ] **AGB** (terms & conditions).
- [ ] **Widerrufsbelehrung** (right of withdrawal) for consumer orders.
- [ ] Cookie/consent handling appropriate for the tools used.
- [ ] Review each legal page for leftover placeholder text before launch.

---

## 7. Final pre-launch smoke test (in live mode)

- [ ] Real end-to-end payment with a live card:
  - [ ] Checkout succeeds and redirects to the success page.
  - [ ] Order-confirmation **email** arrives (validates the live webhook + Resend path).
  - [ ] Order PDF downloads and matches the email.
  - [ ] Order appears in the admin dashboard with status `bezahlt`.
- [ ] Create a booking → confirmation email received; verify it shows in admin.
- [ ] Admin login works with production credentials.
- [ ] Spot-check the shop, cart, and account flows on mobile + desktop.

---

## 8. Nice-to-have (post-launch)

- [ ] Error monitoring (e.g. Sentry) wired up.
- [ ] Analytics / uptime monitoring.
- [ ] Verify the E2E suite is green in CI (GitHub Actions → `e2e.yml`).

---

### Quick reference — endpoints & scripts

| Item | Path / command |
|---|---|
| Stripe webhook | `POST /api/webhooks/stripe` |
| Booking-reminder cron | `GET /api/cron/booking-reminders` (daily 08:00) |
| Apply DB migrations | `npm run migrate` |
| Run E2E tests | `npm test` |
| Local webhook forwarding (dev) | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` |

All required environment variables are documented with placeholders in `.env.example`.
