# ✅ Security Action Items & Production Setup

These items were moved out of [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) because they are
**open tasks and deployment steps**, not part of the "already-fixed" findings list. Tracking
them here keeps the audit focused on what's *done* and this file focused on what's *to do*.

> **Status legend:** `[x]` = done/verified · `[ ]` = not done yet · ⏳ = needs a manual step
> outside this repo (e.g. in the Vercel dashboard) that can't be verified from the code.

_Last verified against the codebase: **2026-06-30**._

---

## A. Remaining low-severity code items

- [x] **L-1 — `metadata.json` contains no secrets**
  - **What:** Make sure the root `metadata.json` has no API keys/tokens before committing.
  - **Status:** ✅ **Verified clean.** The file only contains the app `name`, `description`,
    and an empty `requestFramePermissions` array. No secrets present.

- [ ] **L-2 — Re-enable ESLint during builds**
  - **What:** `next.config.ts` currently sets `eslint.ignoreDuringBuilds: true`, which means
    lint warnings (some security-relevant) don't block a build.
  - **Status:** ❌ **Not done yet.** Still `true` in `next.config.ts`.
  - **To do:** Set it to `false`, run `npm run build`, and fix any lint errors that surface.
    (Recommended before treating the build as production-grade, but optional for a portfolio repo.)

- [ ] **L-3 — Tighten the Content-Security-Policy (remove `unsafe-inline` / `unsafe-eval`)**
  - **What:** The CSP in `next.config.ts` allows `'unsafe-inline'` and `'unsafe-eval'` for
    scripts/styles. These are needed by Next.js dev mode but weaken XSS protection.
  - **Status:** ❌ **Not done yet.** Both are still present in the CSP.
  - **To do:** Move to a **nonce-based CSP** in production.
    See: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
  - **Note:** This is an enhancement, not an active vulnerability — the rest of the headers
    (HSTS, X-Frame-Options, etc.) are already in place.

---

## B. One-time production setup (Vercel / environment)

These can't be verified from the source code — they live in the Vercel dashboard. Tick them
once you've completed them in your hosting environment.

- [ ] **Upstash Redis — persistent rate limiting in production** ⏳
  - **Why:** Without it, serverless cold starts reset the in-memory rate limiter (finding #25),
    weakening brute-force protection. **The code is already written and ready** — it just needs
    the two environment variables.
  - **Steps:**
    1. Go to https://console.upstash.com → create a serverless Redis database.
    2. Copy the REST URL and token.
    3. Add them to **Vercel → Project → Settings → Environment Variables** (and to `.env.local`
       for local testing):
       ```
       UPSTASH_REDIS_REST_URL=https://YOUR_URL.upstash.io
       UPSTASH_REDIS_REST_TOKEN=YOUR_TOKEN
       ```
  - **Status:** ⏳ **Cannot be verified from the repo.** If you have **not** added these in
    Vercel, leave unticked. Without them the app still runs (in-memory fallback), but rate
    limiting is weaker in production.

- [ ] **`CRON_SECRET` — add the strong secret to Vercel** ⏳
  - **Why:** The scheduled booking-reminder job authenticates with `CRON_SECRET`. The strong
    64-char value already exists in your local `.env.local` (finding #16), but the **production**
    cron job needs the same value set in Vercel to work.
  - **Steps:** Copy the `CRON_SECRET` value from `.env.local` → add it as an environment
    variable in **Vercel → Project → Settings → Environment Variables**.
  - **Status:** ⏳ **Cannot be verified from the repo.** Tick once it's set in Vercel.

---

## Summary

| Item | Type | Status |
| --- | --- | --- |
| L-1 — metadata.json no secrets | Code | ✅ Done |
| L-2 — ESLint on builds | Code | ❌ Not done |
| L-3 — Nonce-based CSP | Code | ❌ Not done (enhancement) |
| Upstash Redis env vars | Deployment | ⏳ Verify in Vercel |
| CRON_SECRET in Vercel | Deployment | ⏳ Verify in Vercel |

