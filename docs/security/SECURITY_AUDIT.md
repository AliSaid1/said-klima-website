# Security Audit Report
**Project:** said-website-klima  
**Date:** 2026-03-28 (updated same day)  
**Scope:** Full codebase scan — all API routes, middleware, config, scripts, env files

---

## ✅ All Fixes Applied

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | No rate limiting on auth/booking/checkout routes | **CRITICAL** | ✅ Fixed |
| 2 | Hardcoded Supabase service-role key in 4 scripts | **CRITICAL** | ✅ Fixed |
| 3 | Hardcoded ANON key in 4 scripts | **HIGH** | ✅ Fixed |
| 4 | Hardcoded plaintext test passwords in scripts | **HIGH** | ✅ Fixed |
| 5 | IDOR: benutzer-adressen trusted `benutzer_id` from request body | **CRITICAL** | ✅ Fixed |
| 6 | `GET /api/media` — no authentication, open to anyone | **HIGH** | ✅ Fixed |
| 7 | `POST/PUT/DELETE /api/services` — only checked logged-in, not admin | **HIGH** | ✅ Fixed |
| 8 | `PUT /api/content/[slug]` — only checked logged-in, not admin | **HIGH** | ✅ Fixed |
| 9 | No HTML sanitization for RTE content before DB storage | **HIGH** | ✅ Fixed |
| 10 | `NODE_TLS_REJECT_UNAUTHORIZED = '0'` in next.config.ts dev | **HIGH** | ✅ Fixed |
| 11 | No security headers (CSP, HSTS, X-Frame-Options, etc.) | **MEDIUM** | ✅ Fixed |
| 12 | Bucket name for upload not validated (arbitrary bucket writes) | **MEDIUM** | ✅ Fixed |
| 13 | Filename path traversal possible on upload | **MEDIUM** | ✅ Fixed |
| 14 | `project_bundle_*.txt`, `dev-output.log` not in .gitignore | **LOW** | ✅ Fixed |
| 15 | `.env.example` missing GEMINI_API_KEY and APP_URL | **LOW** | ✅ Fixed |
| 16 | CRON_SECRET was weak (`test-cron-secret-12345`) | **CRITICAL** | ✅ Fixed — rotated to 64-char hex secret |
| 17 | `.env.local` never committed to git (C-2 verification) | **CRITICAL** | ✅ Verified clean — no history found |
| 18 | `vercel.json` cron path wrong (`/api/cron/reminders`) | **CRITICAL** | ✅ Fixed → `/api/cron/booking-reminders` |
| 19 | `GET /api/orders` — any auth user could see ALL orders | **HIGH** | ✅ Fixed — admin sees all; users see only their own |
| 20 | `GET /api/bookings` — non-admin users could enumerate others' bookings | **HIGH** | ✅ Fixed — enforced user scope; email param ignored for auth users |
| 21 | `GET /api/products` — used admin client (bypassed RLS) for public read | **HIGH** | ✅ Fixed — switched to anon client with RLS |
| 22 | Checkout POST — client-supplied prices, no Stripe idempotency | **HIGH** | ✅ Fixed — server-side price fetch from DB + idempotency key |
| 23 | Cart prices client-supplied — user could pay less than actual price | **HIGH** | ✅ Fixed — prices fetched from DB; article ID/active status validated |
| 24 | No CSRF protection (session cookies missing SameSite/Secure) | **HIGH** | ✅ Fixed — SameSite=Lax, httpOnly=true, Secure=true in production |
| 25 | In-memory rate limiter resets on cold starts (serverless) | **MEDIUM** | ✅ Fixed — Upstash Redis integration added (auto-fallback to in-memory in dev) |
| 26 | Email templates — no auth, no input length limits | **MEDIUM** | ✅ Fixed — admin guard added, betreff max 500 chars, HTML max 100 KB, sanitized |
| 27 | `seed-availability` — completely unauthenticated endpoint | **MEDIUM** | ✅ Fixed — admin guard added |
| 28 | Error messages leaked raw DB details to clients | **MEDIUM** | ✅ Fixed — `lib/api-response.ts` masks errors in production, logs server-side |

---

## ✅ New Security Infrastructure Added

| File | Purpose |
|------|---------|
| `lib/rate-limit.ts` | Sliding-window rate limiter — Upstash Redis in prod, in-memory in dev |
| `lib/sanitize.ts` | HTML sanitizer (allowlist), plain-text sanitizer, UUID validator |
| `lib/auth-guard.ts` | Reusable `requireAdmin()` / `requireAuth()` helpers for all API routes |
| `lib/api-response.ts` | `apiServerError()` — masks DB errors in production, logs server-side |

---

## 📎 Related documents

- **Plain-English explanation of every finding above** (what was wrong, why it mattered, how
  we fixed it — written for non-security readers):
  [`SECURITY_FINDINGS_EXPLAINED.md`](SECURITY_FINDINGS_EXPLAINED.md)
- **Open action items & one-time production setup** (remaining low-severity items, Upstash
  Redis, `CRON_SECRET`) tracked as a checklist:
  [`SECURITY_ACTION_ITEMS.md`](SECURITY_ACTION_ITEMS.md)

---

## Security Architecture — What's Good ✅

- Supabase service-role key is **never exposed to the browser**
- `NEXT_PUBLIC_*` keys are only the anon key (safe to expose)
- `lib/supabase/admin.ts` is server-only
- Stripe webhook signature verification is correct
- Cron endpoint requires `Authorization: Bearer CRON_SECRET`
- Zod validators cover bookings, articles, addresses
- `.env.local` has **never been committed** to git (verified)
- Passwords are never stored in plaintext (Supabase Auth handles hashing)
- All session cookies now enforce SameSite=Lax + httpOnly + Secure (production)
- Rate limiting on all sensitive routes with Upstash Redis fallback
- Server-side price validation prevents price manipulation attacks
