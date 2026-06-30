# Backend API Refactoring Plan — Senior Feedback Analysis

> Status: **📋 PLANNED — analysis & roadmap, not yet implemented**
> Created: 2026-06-30
> Scope: API layer (`app/api/**`), data-access patterns, backend architecture
> Trigger: Code-review feedback from a senior developer

---

## Table of Contents

1. [Background](#1-background)
2. [Feedback Item 1 — Centralize query selects](#2-feedback-item-1--centralize-query-selects)
3. [Feedback Item 2 — NestJS vs Next.js](#3-feedback-item-2--nestjs-vs-nextjs)
4. [Feedback Item 3 — ORM ("URM")](#4-feedback-item-3--orm-urm)
5. [Phased Implementation Plan](#5-phased-implementation-plan)
6. [Why implement these in the future](#6-why-implement-these-in-the-future)
7. [Summary & recommendation](#7-summary--recommendation)

---

## 1. Background

During a code review, a senior developer gave three pieces of feedback on the backend:

1. **Don't hardcode the full query/"SQL schema" inline** in every API route — wrap it in a
   clearly-named method/definition (e.g. `getProduktById`) and reuse it.
2. **Consider NestJS instead of Next.js** for the backend.
3. **Look into ORM** (Object-Relational Mapping).

This document analyses each point, decides what is worth doing, and lays out a phased plan.
**No code has been changed yet.**

### Current stack (for context)
- **Next.js 15** (App Router) — UI + SSR + API routes in one app
- **Supabase JS client** (PostgREST) for data access — hand-written `select()` strings
- **Zod** for input validation
- Deployed on **Vercel**
- No ORM today

### The concrete problem that prompted item 1
The product (`artikel`) select definition is **duplicated across 5 places** with slight
variations:

- `app/api/products/route.ts` (admin list)
- `app/api/products/[id]/route.ts` (detail / update / delete)
- `app/api/shop/products/route.ts` (public list)
- `app/api/shop/products/[id]/route.ts` (public detail — *already* extracted into a local
  `SELECT` constant ✅, which is the seed of the pattern the senior wants)

Example of the repeated block:

```ts
.select(`
  *,
  marken(id, name),
  kategorien(id, name, slug),
  lagerbestaende(bestand, mindestbestand),
  artikel_bilder(id, datei_id, alt_text, anzeige_reihenfolge, medien_dateien(speicherpfad)),
  artikel_technische_daten(id, inhalt, anzeige_reihenfolge)
`, { count: 'exact' });
```

---

## 2. Feedback Item 1 — Centralize query selects

**Verdict: ✅ Valid — should be done (low risk, high value).**

**What it means.** Move the repeated `select(...)` definitions into a single, well-named
source (e.g. `lib/queries/artikel.ts`) and import them, instead of re-typing the string in
each route.

**Why it's a problem today.** If a column is added/renamed on the `artikel` table, the change
must be made in **5 separate strings**. Missing one means that endpoint silently returns
incomplete or wrong data — a bug that's easy to introduce and hard to notice.

**Accuracy note.** Technically this is **Supabase/PostgREST select syntax**, not raw "SQL
schema" — but the DRY principle the senior is pointing at is exactly right.

---

## 3. Feedback Item 2 — NestJS vs Next.js

**Verdict: ⚠️ Do NOT migrate. Adopt the *pattern*, not the framework.**

**Key clarification: they are not direct competitors.**

| | **Next.js** (current) | **NestJS** (suggested) |
| --- | --- | --- |
| What it is | Full-stack **React framework** (UI + SSR + API) | **Backend-only** framework (structured REST/GraphQL API) |
| Renders the website? | ✅ Yes (shop, admin, SSR/SEO) | ❌ No — API only; needs a separate frontend |
| Best for | Integrated web apps, e-commerce, SSR | Large standalone APIs, microservices, many clients |
| Structure | Routes + functions (lighter) | Controllers + Services + Modules + Dependency Injection |

**Why migrating is not worth it here.** NestJS would not *replace* Next.js — it would force
splitting the project into **two apps** (a NestJS API **and** a separate React/Next frontend),
with two deployments and more maintenance. This e-commerce site depends on Next.js
server-rendering for SEO and the admin panel, so the cost is high and the benefit low.

**What IS worth borrowing.** NestJS's strength is **clean layering** — thin controllers, with
business logic in **services**. We can adopt that pattern *inside Next.js*: move DB/business
logic out of route handlers into a `lib/services/…` layer. Same maintainability benefit, no
migration.

**When NestJS would actually make sense (future):** if the API needs to become a large,
standalone product serving multiple frontends (web + mobile + partners), with complex domain
logic and a dedicated backend team.

---

## 4. Feedback Item 3 — ORM

**Verdict: 🔶 Worth considering later — start with free type safety, not a rewrite.**

"URM" is almost certainly **ORM** (Object-Relational Mapping): a library that defines the
schema **once** and gives **type-safe queries** instead of hand-written strings. This is the
deeper version of Item 1.

**Where we are now.** Supabase client + hand-written selects + Zod. Queries return loosely
typed data, so a mistyped column name fails at **runtime**, not at compile time.

| Option | Effort | What it gives |
| --- | --- | --- |
| **A. Stay on Supabase + generate types** (`supabase gen types typescript`) | 🟢 Low | Compile-time type safety on existing queries, no rewrite |
| **B. Add Drizzle ORM** (lightweight, Postgres-native) | 🟡 Medium | Schema-as-code, autocomplete, safer refactors |
| **C. Prisma** | 🟠 High | Full ORM, but heavier and overlaps awkwardly with Supabase RLS/Auth |

**Recommendation.** Begin with **Option A** (type generation — big safety win, minimal work).
Treat **Drizzle (B)** as a possible later step, spiked on one module first. Avoid a full
Prisma migration, which would fight the existing Supabase RLS/Auth model.

---

## 5. Phased Implementation Plan

Ordered safest/highest-value first. Each phase is independently shippable.

### Phase 1 — Centralize query selects *(addresses Item 1)*
- Create `lib/queries/artikel.ts` exporting named, commented selects:
  `ARTIKEL_LIST_SELECT`, `ARTIKEL_DETAIL_SELECT`, `ARTIKEL_PUBLIC_SELECT`, plus optional
  small builders such as `selectArtikelById(db, id)`.
- Replace the 5 inline select strings in the product/shop routes with these constants.
- Verify each route returns **identical** data (no behavior change); run lint + build.
- **Risk:** 🟢 Low. **Value:** 🟢 High.

### Phase 2 — Thin service layer *(captures the good part of Item 2, stays on Next.js)*
- Add `lib/services/produkt-service.ts` with functions like `getProdukte(filters)`,
  `getProduktById(id)`, `createProdukt(data)` wrapping the DB calls.
- Slim route handlers to: **validate input → call service → return response**
  (routes become thin "controllers").
- **Risk:** 🟡 Medium (touches route structure). **Value:** 🟢 High (testability, reuse).

### Phase 3 *(optional, later)* — Type safety / ORM *(addresses Item 3)*
- Generate Supabase TypeScript types and apply them to the client (Option A).
- Evaluate **Drizzle** on a single module as a spike before any broader adoption (Option B).
- **Risk:** 🟡 Medium. **Value:** 🟡 Medium-High.

### Explicitly out of scope
- ❌ Full migration to NestJS.
- ❌ Full Prisma migration.

---

## 6. Why implement these in the future

The app works today, so these are **maintainability and scalability** investments, not bug
fixes. Reasons to do them as the project grows:

1. **Single source of truth (Phase 1).** One place to change a query shape → fewer silent
   bugs when the schema evolves, and easier onboarding.
2. **Separation of concerns (Phase 2).** Business logic in services can be **unit-tested**
   without HTTP, **reused** across routes/cron/webhooks, and kept consistent. Routes stay
   small and readable.
3. **Type safety (Phase 3).** Catching column/typo errors at **compile time** instead of in
   production is one of the highest-leverage reliability upgrades for a TypeScript backend.
4. **Future flexibility.** A clean service layer means that *if* a standalone API (NestJS) or
   an ORM (Drizzle) is ever justified, the migration is far smaller because the data logic is
   already isolated.
5. **Professional signal.** For a portfolio/interview context, a layered, DRY, type-safe
   backend demonstrates senior-level structure — which is exactly what this feedback is
   nudging toward.

---

## 7. Summary & recommendation

| Feedback | Verdict | Action |
| --- | --- | --- |
| Centralize selects | ✅ Do it | Phase 1 |
| NestJS instead of Next.js | ⚠️ Don't migrate | Adopt service-layer pattern (Phase 2) |
| ORM ("URM") | 🔶 Later | Start with type generation, spike Drizzle (Phase 3) |

**One-line recommendation:** Do **Phase 1** first, adopt **Phase 2's service-layer pattern**
(the real value behind the NestJS comment), **skip the NestJS migration**, and **defer the
ORM** to a low-effort type-generation step rather than a rewrite.

