# Said Kälte- & Klimatechnik — Full-Stack E-Commerce & Service Platform

> A production-grade e-commerce and field-service booking platform for a German
> refrigeration & air-conditioning company (*Kälte- und Klimatechnik*), built with
> Next.js 15, Supabase, Stripe and Resend — and engineered through a
> **documentation-driven, agentic AI development workflow**.

---

## Contents

1. [Executive Summary](#1-executive-summary)
2. [What the Platform Does (Feature Overview)](#2-what-the-platform-does-feature-overview)
3. [Technology Stack](#3-technology-stack)
4. [Architecture](#4-architecture)
5. [Data Model (Highlights)](#5-data-model-highlights)
6. [Security — A First-Class Concern](#6-security--a-first-class-concern)
7. [How This Was Built — Documentation-Driven Agentic Development (DDAD)](#7-how-this-was-built--documentation-driven-agentic-development-ddad)
8. [Engineering Practices Demonstrated](#8-engineering-practices-demonstrated)
9. [Summary for Reviewers](#9-summary-for-reviewers)

---

## 1. Executive Summary

This project is a complete digital storefront and back-office for a refrigeration &
air-conditioning business. It combines two products in one codebase:

1. **A public e-commerce shop** — customers browse products (split units, cassette
   units, accessories), configure variants (e.g. pipe lengths), add to cart, and pay
   securely via Stripe Checkout.
2. **A field-service booking system** — customers book on-site services (installation,
   maintenance, repair, consultation) against real technician availability, with
   automated email confirmations and reminders.

Behind both sits a **custom admin dashboard / CMS** that lets the business owner manage
products, categories, orders, bookings, technicians, legal/CMS content, email templates,
company branding and settings — without touching code.

What makes this project notable for a portfolio is **not only what was built, but how
it was built**: the entire lifecycle was driven by a deliberate, structured
**AI-agent workflow** governed by versioned Markdown specification files — a practice
I call **Documentation-Driven Agentic Development (DDAD)** (described in
[Section 7](#7-how-this-was-built--documentation-driven-agentic-development-ddad)).

---

## 2. What the Platform Does (Feature Overview)

### Public-facing site
- **Product catalog & detail pages** with brands, categories, images, rich-text
  technical specifications, and JSONB-based price variants ("Ab-Preis" / on-request items).
- **Shopping cart** held in client-side React state + `localStorage` (intentionally
  serverless — no DB cart).
- **Stripe Checkout** (hosted redirect mode) with server-side price validation, VAT
  handling, shipping rules and idempotency.
- **Order confirmation, PDF invoices** (`@react-pdf/renderer`) and **transactional
  emails** via Resend.
- **Service booking flow** — choose service → pick an available date/time against
  technician availability → confirm → receive email.
- **Customer accounts** (Supabase Auth) — registration, login, password reset, saved
  addresses, order history.
- **Dynamic legal/CMS pages** (AGB, Impressum, Datenschutz, Widerruf) rendered from the
  database with sanitized HTML.

### Admin dashboard (`/admin`, protected)
- **Dashboard KPIs** — products, open orders, upcoming bookings, revenue.
- **Product management** — full CRUD, image upload (drag & drop), variants, SEO fields,
  rich-text technical data (Tiptap editor), stock levels.
- **Category & brand management.**
- **Order management** — list, filter, status workflow (`offen → bezahlt → versendet →
  storniert`), internal notes, CSV export, PDF invoices.
- **Booking management** — calendar view (`react-big-calendar`), technician scheduling,
  availability config, blocked dates.
- **Content CMS** — rich-text editor with **version history** for legal pages.
- **Email-template editor** — editable transactional templates with `{{placeholder}}`
  variables.
- **Company settings** — branding colors (live theming), opening hours, logo, VAT ID.

---

## 3. Technology Stack

| Layer | Technology |
| --- | --- |
| Framework | **Next.js 15** (App Router, React Server Components) |
| UI | **React 19**, **TypeScript 5.9** (strict) |
| Styling | **Tailwind CSS v4** + `tailwind-merge`/`clsx` (`cn()` helper) |
| Animation | **Motion** (ex-Framer Motion) |
| Database | **Supabase** (PostgreSQL) with **Row Level Security** |
| Auth | **Supabase Auth** (email/password, role-based) |
| Storage | **Supabase Storage** (product images, CMS media, logos) |
| Payments | **Stripe Checkout** (redirect) + webhooks |
| Email | **Resend** (transactional) |
| PDF | **@react-pdf/renderer** (invoices) |
| Rich text | **Tiptap** |
| Calendar | **react-big-calendar** |
| Forms / validation | **react-hook-form** + **Zod** |
| Rate limiting | **Upstash Redis** (prod) with in-memory fallback (dev) |
| Hosting | **Vercel** (serverless, cron jobs) |
| Testing | **Playwright** (E2E) |

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                          VERCEL                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   Next.js 15 App                       │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐   │ │
│  │  │  Public Site │  │ Admin /admin │  │  API Routes │   │ │
│  │  │  (RSC/SSR)   │  │  (Protected) │  │   /api/*    │   │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘   │ │
│  │         └─────────────────┼─────────────────┘          │ │
│  │                   ┌───────▼────────┐                    │ │
│  │                   │  middleware.ts │  Auth guard +      │ │
│  │                   │                │  rate limiting     │ │
│  │                   └───────┬────────┘                    │ │
│  └───────────────────────────┼───────────────────────────┘ │
│              Vercel Cron ──── /api/cron/booking-reminders   │
└──────────────────┬──────────────┬──────────────┬───────────┘
                   │              │              │
          ┌────────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
          │   Supabase    │ │  Stripe  │ │   Resend    │
          │ Postgres/Auth │ │ Checkout │ │  (Emails)   │
          │   /Storage    │ │ Webhooks │ │             │
          └───────────────┘ └──────────┘ └─────────────┘
```

### Key architectural decisions
- **Server Components by default**, `'use client'` only where interactivity is required.
- **Data reads** happen in Server Components via the Supabase server client; **mutations**
  go exclusively through `/api/*` Route Handlers.
- **Three Supabase clients** with clear trust boundaries:
  - `client` (browser, anon key) → subject to RLS.
  - `server` (cookie-aware, anon key) → subject to RLS, used for SSR reads.
  - `admin` (service-role key, **server-only**) → bypasses RLS for trusted operations
    (webhooks, cron, admin writes).
- **Defense in depth**: PostgreSQL RLS policies act as a database-level safety net *plus*
  application-level `requireAdmin()` / `requireAuth()` guards in every sensitive route.
- **Stateless cart**: deliberately kept in `localStorage` — the order of record is only
  created server-side after a verified Stripe payment, eliminating a whole class of
  price-tampering and abandoned-cart complexity.

### Repository structure
```
app/            Next.js App Router — public pages, /admin dashboard, /api routes
components/     layout/ · home/ · admin/ · shop/ · ui/  (organized by domain)
lib/            supabase/ · validators/ · pdf/ + security & utility helpers
hooks/          custom React hooks
supabase/       SQL migrations (001 → 014)
scripts/        migration runner + diagnostic scripts
tests/          Playwright E2E specs
docs/           living documentation (DB structure, security audit, plans, skills)
_archive/       historical planning docs kept for provenance
```

---

## 5. Data Model (Highlights)

The database uses **German-language table/column naming** to match the business domain,
with English identifiers in application code. ~24 active tables, fully documented in
[`docs/DB_STRUCTURE.md`](docs/DB_STRUCTURE.md) — which is treated as the **single source
of truth, verified directly against the live database** rather than trusting migration
files.

Representative tables:
- `artikel` (products) — incl. a `varianten` **JSONB** column for lightweight price
  variants and an `ist_ab_preis` flag for "on request" pricing.
- `bestellungen` / `bestellpositionen` (orders / line items) — with Stripe references and
  snapshotted pricing.
- `buchungen` (bookings) + `buchung_dienstleistungen` junction, `techniker`,
  `techniker_verfuegbarkeit`, `gesperrte_tage`.
- `rechtstexte` + `inhalt_versionen` (CMS content with version history).
- `firmeneinstellungen` (singleton company settings incl. brand colors).
- `zahlungen` / `zahlungsvorgaenge` (payments + raw webhook event log).

The DB doc also transparently records **legacy/unused tables** (e.g. server-side cart
tables) with explicit *keep / drop* decisions and the reasoning behind each — an honest
audit trail rather than hidden cruft.

---

## 6. Security — A First-Class Concern

Because much of the code was AI-assisted, security was treated as a **dedicated,
auditable workstream** rather than an afterthought. A full
[`docs/security/SECURITY_AUDIT.md`](docs/security/SECURITY_AUDIT.md) scanned every API
route, middleware, config and script. **28 findings** (several *critical*) were
identified and fixed.

### Reusable security infrastructure that was built
| Module | Purpose |
| --- | --- |
| `lib/rate-limit.ts` | Sliding-window rate limiter — Upstash Redis in prod, in-memory fallback in dev |
| `lib/sanitize.ts` | HTML allowlist sanitizer + plain-text sanitizer + UUID validator |
| `lib/auth-guard.ts` | Reusable `requireAdmin()` / `requireAuth()` helpers for API routes |
| `lib/api-response.ts` | Masks raw DB errors in production; logs full detail server-side |
| `middleware.ts` | Centralized rate limiting on auth/booking/checkout + auth session refresh |

### Representative classes of vulnerability fixed
- **IDOR** — endpoints that trusted IDs from the request body were rewritten to derive
  identity from the authenticated session.
- **Broken access control** — routes that only checked "logged in" were upgraded to
  enforce **admin role**; public reads were moved to the anon client so **RLS applies**.
- **Price manipulation** — checkout now **fetches prices server-side from the DB** and
  ignores any client-supplied amounts; Stripe **idempotency keys** prevent duplicate
  charges.
- **Secret hygiene** — hardcoded service-role/anon keys and test passwords removed from
  scripts; a weak `CRON_SECRET` rotated to a 64-char hex value; `.env.local` confirmed
  never committed.
- **XSS** — all rich-text/CMS HTML sanitized via an allowlist before storage and render.
- **Transport & headers** — security headers (CSP, HSTS, X-Frame-Options) added;
  `NODE_TLS_REJECT_UNAUTHORIZED=0` removed; cookies set `httpOnly` + `SameSite=Lax` +
  `Secure` in production (CSRF mitigation).
- **Webhook integrity** — Stripe webhook signatures verified before any event is processed.

> **Principle applied:** *the AI writes the code, but a documented human-reviewed audit
> verifies the trust boundaries.* This is exactly the discipline AI-driven development
> needs, and it is a core part of what this project demonstrates.

---

## 7. How This Was Built — Documentation-Driven Agentic Development (DDAD)

This is the part of the project I'm proudest of and the part most relevant to modern
engineering teams. AI coding assistants were not used ad-hoc; they were orchestrated
through a **layered set of Markdown specification files** that acted as the agent's
long-term memory, rules, and contract. Each file plays a distinct role:

| File | Role in the workflow | Analogy |
| --- | --- | --- |
| [`_archive/docs/INSTRUCTIONS.md`](_archive/docs/INSTRUCTIONS.md) | Tech stack, design tokens, naming conventions, file-structure rules, coding standards that **every** generated file must follow | The project **constitution / system prompt** |
| [`_archive/docs/PLAN.md`](_archive/docs/PLAN.md) | A 95-item, 8-phase build checklist with live `[x]/[ ]` status tracking and a progress table | The **roadmap / backlog** |
| [`docs/DB_STRUCTURE.md`](docs/DB_STRUCTURE.md) | Source-of-truth schema verified against the live DB, with reasoning for every design choice | The **shared mental model** |
| [`docs/STRIPE_SKILLS.md`](docs/STRIPE_SKILLS.md) | Domain "skill" rules loaded into the assistant for any Stripe work | A **scoped expert skill pack** |
| [`docs/security/SECURITY_AUDIT.md`](docs/security/SECURITY_AUDIT.md) | A tracked findings → fixes ledger | The **security gate** |
| [`docs/plans/REFACTORING_PLAN.md`](docs/plans/REFACTORING_PLAN.md) + other `plans/*` | Per-feature specs (Stripe checkout, email branding, PDF invoices, deployment) written *before* implementation | **Design docs / RFCs** |

### The workflow loop
1. **Specify** — write or update a Markdown spec (constitution, plan, or feature RFC)
   describing intent, constraints and acceptance criteria.
2. **Generate** — instruct the AI agent to implement against that spec; the agent reads
   the rules files so output stays consistent (design tokens, naming, server/client
   boundaries, validation).
3. **Track** — tick items off `PLAN.md`, keeping a transparent record of progress.
4. **Audit** — run a dedicated security/refactor pass documented in its own file.
5. **Reconcile** — verify reality against docs (e.g. the DB doc inspects the *live*
   database, not just migrations) and record any drift honestly.

### Why give it a name?
This goes by several emerging industry terms — **Spec-Driven Development**,
**Documentation-Driven Development**, or **Agentic / Spec-First AI Engineering**. The
specific flavor used here, where versioned Markdown files serve simultaneously as
*system prompt, backlog, source of truth, and audit log* for an AI agent, is best
described as:

> ### 🧭 **Documentation-Driven Agentic Development (DDAD)**
> *Specs as code for the AI: durable Markdown artifacts govern an AI agent's behavior,
> scope, and quality bar across the whole lifecycle — with security and schema treated
> as continuously-verified living documents.*

This approach delivered three concrete benefits:
- **Consistency at scale** — dozens of pages/routes share identical conventions because
  the agent always consulted the same constitution.
- **Auditability** — every decision (including "do not build this" decisions) is written
  down and justified, which is critical for trustworthy AI-assisted code.
- **Onboarding speed** — a new engineer (human *or* agent) can read `docs/` and be
  productive immediately.

---

## 8. Engineering Practices Demonstrated

- **Type-safe end to end** — strict TypeScript + Zod validation on both client and server.
- **Separation of concerns** — reads in Server Components, mutations in API routes,
  shared guards/validators/helpers in `lib/`.
- **Database migrations** — versioned SQL (`001 → 014`) with a custom migration runner
  using the Supabase Management API.
- **Performance** — ISR on legal pages, lazy-loaded heavy editors, `React.memo` on admin
  chrome, image optimization.
- **Automated testing** — Playwright E2E specs (e.g. address management, upload flows).
- **CI-ready config** — ESLint flat config, Playwright config, Vercel cron config.
- **Internationalization mindset** — German UI labels with English code identifiers,
  correct VAT/gross-price math.

---

## 9. Summary for Reviewers

This project is a **real, end-to-end SaaS-grade application** — payments, scheduling,
CMS, auth, file storage, transactional email and a full admin back-office — built on a
modern Next.js 15 / React 19 / Supabase / Stripe stack.

Equally important, it demonstrates a **mature, security-conscious way of working with AI
coding agents**: a documentation-driven, spec-first methodology (DDAD) where versioned
Markdown files govern the agent, and where a dedicated security audit verifies every
trust boundary the AI produced. It shows not just that I can ship features with AI, but
that I can **direct, constrain, document and audit** AI-assisted development to a
production standard.

---

*Built by Ali Said. Stack: Next.js 15 · React 19 · TypeScript · Supabase · Stripe ·
Resend · Tailwind CSS v4 · Vercel.*

