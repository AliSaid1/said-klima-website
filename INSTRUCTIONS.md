# INSTRUCTIONS — Said Kälte- & Klimatechnik Admin Dashboard

> This file defines all conventions, design tokens, and technical rules for the project.
> Every file created or modified MUST follow these instructions.

---

## 1. Tech Stack

| Layer              | Technology                                      |
| ------------------ | ----------------------------------------------- |
| Framework          | **Next.js 15** (App Router, Server Components)  |
| UI Library         | **React 19**                                    |
| Language           | **TypeScript 5.9** (strict mode)                |
| Styling            | **Tailwind CSS v4** (`@tailwindcss/postcss`)     |
| Animations         | **Motion** (formerly Framer Motion)             |
| Icons              | **lucide-react**                                |
| Database           | **Supabase** (Postgres)                         |
| Auth               | **Supabase Auth** (email/password, admin roles) |
| File Storage       | **Supabase Storage** (product images, logo, CMS media) |
| Payments           | **Stripe Checkout** (redirect mode)             |
| Emails             | **Resend** (transactional emails)               |
| Hosting            | **Vercel** (serverless, edge, cron jobs)        |
| Forms              | **react-hook-form** + **zod** validation        |
| Rich Text Editor   | **Tiptap** (@tiptap/react)                      |
| Calendar           | **react-big-calendar**                          |
| CSV Export          | **papaparse**                                   |
| Utilities          | **clsx** + **tailwind-merge** (via `cn()` in `lib/utils.ts`) |

---

## 2. Design System & Tokens

### 2.1 Colors

| Token       | Value              | Usage                                |
| ----------- | ------------------ | ------------------------------------ |
| Primary     | `blue-600` (#2563EB) | Buttons, links, active states, accents |
| Primary Hover | `blue-700`       | Button hover states                  |
| Primary Light | `blue-50` / `blue-100` | Badges, light backgrounds       |
| Text Primary | `slate-900`       | Headings, bold text                  |
| Text Secondary | `slate-600`     | Body text, descriptions              |
| Text Muted  | `slate-500`        | Labels, captions, timestamps         |
| Text Subtle | `slate-400`        | Placeholders, disabled               |
| Background  | `slate-50`         | Page backgrounds                     |
| Surface     | `white`            | Cards, modals, panels                |
| Border      | `slate-100` / `slate-200` | Card borders, dividers         |
| Dark BG     | `slate-900`        | Footer, dark sections, dark cards    |
| Success     | `green-100` text `green-800` | Status badges              |
| Warning     | `yellow-100` text `yellow-800` | Warning badges            |
| Danger      | `red-100` text `red-800` / `red-600` | Error, delete, cancel |

### 2.2 Typography

| Element       | Font             | Class                                    |
| ------------- | ---------------- | ---------------------------------------- |
| Headings      | **Outfit**       | `font-outfit font-bold`                  |
| Body          | **Inter**        | `font-sans` (default)                    |
| Small Labels  | Inter            | `text-sm font-bold tracking-wider uppercase text-slate-500` |
| Section Badge | Inter            | `text-xs font-bold tracking-wider uppercase text-blue-600` |

### 2.3 Spacing & Radius

| Element              | Class                          |
| -------------------- | ------------------------------ |
| Cards                | `rounded-3xl` or `rounded-2xl` |
| Buttons (pill)       | `rounded-full`                 |
| Input fields         | `rounded-xl`                   |
| Small badges         | `rounded-full`                 |
| Admin sidebar items  | `rounded-lg`                   |
| Max content width    | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` |

### 2.4 Shadows & Borders

| Pattern              | Class                                        |
| -------------------- | -------------------------------------------- |
| Card default         | `shadow-sm border border-slate-100`          |
| Card hover           | `hover:shadow-xl transition-shadow`          |
| Primary button shadow | `shadow-lg shadow-blue-600/20`              |
| Elevated card        | `shadow-2xl`                                 |

### 2.5 Component Patterns

**Primary Button:**
```
className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
```

**Secondary Button:**
```
className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
```

**Danger Button:**
```
className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
```

**Card:**
```
className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8"
```

**Form Input:**
```
className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
```

**Status Badge:**
```
className="px-2.5 py-0.5 text-xs font-medium rounded-full"
// Variants: bg-green-100 text-green-800 | bg-yellow-100 text-yellow-800 | bg-red-100 text-red-800 | bg-slate-100 text-slate-800
```

**Section Header (admin):**
```
<div className="flex items-center justify-between mb-8">
  <div>
    <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-slate-900">Title</h1>
    <p className="text-slate-500 mt-1">Description</p>
  </div>
  <PrimaryButton />
</div>
```

**Data Table (admin):**
```
<div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
  <table className="w-full text-left">
    <thead className="bg-slate-50 border-b border-slate-200">
      <tr>
        <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Column</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      <tr className="hover:bg-slate-50 transition-colors">
        <td className="px-6 py-4 text-sm text-slate-900">Data</td>
      </tr>
    </tbody>
  </table>
</div>
```

**KPI Stat Card (dashboard):**
```
<div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
  <div className="flex items-center justify-between mb-4">
    <span className="text-sm font-medium text-slate-500">Label</span>
    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
      <Icon className="w-5 h-5" />
    </div>
  </div>
  <p className="text-3xl font-bold text-slate-900">Value</p>
  <p className="text-sm text-slate-500 mt-1">Subtitle</p>
</div>
```

---

## 3. File Structure Rules

```
said-website-klima/
├── app/
│   ├── layout.tsx              # Root layout (public)
│   ├── page.tsx                # Homepage
│   ├── globals.css             # Tailwind + theme variables
│   ├── about/                  # Public: About page
│   ├── account/                # Public: Customer account
│   ├── contact/                # Public: Contact page
│   ├── legal/                  # Public: Legal pages
│   ├── services/               # Public: Services page
│   ├── shop/                   # Public: Shop + product detail
│   ├── cart/                   # Public: Shopping cart
│   ├── checkout/               # Public: Checkout flow
│   │   └── success/            # Post-payment success page
│   ├── booking/                # Public: Booking form
│   ├── admin/                  # ★ ADMIN DASHBOARD (protected)
│   │   ├── layout.tsx          # Admin shell (sidebar + topbar)
│   │   ├── page.tsx            # Dashboard overview
│   │   ├── login/              # Admin login page
│   │   │   └── page.tsx
│   │   ├── products/           # Product management
│   │   │   ├── page.tsx        # Product list
│   │   │   ├── new/
│   │   │   │   └── page.tsx    # Create product
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Edit product
│   │   ├── categories/         # Category management
│   │   │   └── page.tsx
│   │   ├── orders/             # Order management
│   │   │   ├── page.tsx        # Order list
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Order detail
│   │   ├── bookings/           # Booking management
│   │   │   ├── page.tsx        # Calendar view
│   │   │   ├── settings/
│   │   │   │   └── page.tsx    # Time slot config
│   │   │   └── templates/
│   │   │       └── page.tsx    # Email templates
│   │   ├── content/            # CMS content pages
│   │   │   ├── page.tsx        # Content list
│   │   │   └── [slug]/
│   │   │       └── page.tsx    # Content editor
│   │   └── settings/           # Company settings
│   │       └── page.tsx
│   └── api/                    # API Route Handlers
│       ├── products/
│       │   └── route.ts        # GET (list), POST (create)
│       ├── products/[id]/
│       │   └── route.ts        # GET, PUT, DELETE
│       ├── categories/
│       │   └── route.ts
│       ├── orders/
│       │   └── route.ts
│       ├── orders/[id]/
│       │   └── route.ts
│       ├── bookings/
│       │   └── route.ts
│       ├── bookings/[id]/
│       │   └── route.ts
│       ├── content/
│       │   └── route.ts
│       ├── content/[slug]/
│       │   └── route.ts
│       ├── settings/
│       │   └── route.ts
│       ├── upload/
│       │   └── route.ts        # Image upload handler
│       ├── checkout/
│       │   └── route.ts        # Create Stripe Checkout session
│       ├── webhooks/
│       │   └── stripe/
│       │       └── route.ts    # Stripe webhook handler
│       └── cron/
│           └── reminders/
│               └── route.ts    # Vercel cron: booking reminders
├── components/
│   ├── Header.tsx              # Public header
│   ├── Footer.tsx              # Public footer
│   ├── Hero.tsx                # Public hero
│   ├── Services.tsx            # Public services
│   ├── HowItWorks.tsx          # Public how-it-works
│   ├── Products.tsx            # Public products preview
│   ├── admin/                  # ★ ADMIN-ONLY COMPONENTS
│   │   ├── AdminSidebar.tsx
│   │   ├── AdminTopbar.tsx
│   │   ├── StatsCard.tsx
│   │   ├── DataTable.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── ImageUpload.tsx
│   │   ├── RichTextEditor.tsx
│   │   ├── ColorPicker.tsx
│   │   ├── BookingCalendar.tsx
│   │   └── ...
│   └── ui/                     # Shared reusable UI primitives
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Badge.tsx
│       ├── Card.tsx
│       ├── Modal.tsx
│       ├── Skeleton.tsx
│       └── ...
├── lib/
│   ├── utils.ts                # cn() helper
│   ├── data.ts                 # Legacy static data (to be replaced)
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Server-side Supabase client
│   │   ├── admin.ts            # Service-role client (webhooks, cron)
│   │   └── middleware.ts       # Auth helper for middleware
│   ├── stripe.ts               # Stripe client init
│   ├── resend.ts               # Resend client init
│   └── validators/             # Zod schemas
│       ├── product.ts
│       ├── order.ts
│       ├── booking.ts
│       ├── content.ts
│       └── settings.ts
├── hooks/
│   ├── use-mobile.ts
│   ├── use-cart.ts             # Cart state hook
│   └── use-auth.ts             # Auth state hook
├── contexts/
│   └── CartContext.tsx          # Cart provider
├── middleware.ts                # Protect /admin/* routes
├── supabase/
│   └── migrations/             # SQL migration files
│       └── 001_initial_schema.sql
└── vercel.json                 # Cron job config
```

---

## 4. Naming Conventions

| What                | Convention                          | Example                          |
| ------------------- | ----------------------------------- | -------------------------------- |
| Files (components)  | PascalCase                          | `AdminSidebar.tsx`               |
| Files (utils/hooks) | kebab-case                          | `use-cart.ts`                    |
| Files (API routes)  | `route.ts` inside folder            | `app/api/products/route.ts`      |
| Variables/functions | camelCase                           | `filteredProducts`               |
| Types/Interfaces    | PascalCase, prefix `I` only if needed | `Product`, `Order`             |
| Database tables     | snake_case                          | `order_items`, `content_pages`   |
| Database columns    | snake_case                          | `created_at`, `discount_price`   |
| CSS classes         | Tailwind utilities only (no custom CSS unless unavoidable) |           |
| UI labels           | **German** (Produkt, Bestellung, Termin) |                              |
| Code identifiers    | **English** (product, order, booking) |                                |
| Env variables       | SCREAMING_SNAKE_CASE                | `NEXT_PUBLIC_SUPABASE_URL`       |

---

## 5. Coding Rules

1. **Server Components by default.** Only add `'use client'` when the component needs hooks, event handlers, or browser APIs.
2. **All data fetching in Server Components** using the Supabase server client (`lib/supabase/server.ts`).
3. **All mutations through API routes** (`app/api/`). Client components call `fetch('/api/...')`.
4. **Validate all inputs** with zod schemas (`lib/validators/`) on both client (react-hook-form) and server (API route).
5. **Never expose service-role keys** to the client. Use `SUPABASE_SERVICE_ROLE_KEY` only in API routes and server-only files.
6. **Use the `cn()` utility** for conditional class merging. Never use string interpolation for dynamic classes except for simple ternaries.
7. **Images**: Upload to Supabase Storage, store the public URL in the DB. Use `next/image` with proper `width`/`height` or `fill`.
8. **Error handling**: Every API route returns `{ error: string }` with appropriate HTTP status. Client shows toast or inline error.
9. **Loading states**: Use `Skeleton` component (pulse animation with `bg-slate-200 animate-pulse rounded-xl`).
10. **No `any` type.** Define proper interfaces for all data structures.
11. **Keep components small.** Extract reusable pieces into `components/ui/` or `components/admin/`.
12. **Imports**: Use `@/` path alias. Group: React/Next → external libs → internal (`@/lib`, `@/components`, `@/hooks`).

---

## 6. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend
RESEND_API_KEY=re_...

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Legacy (can be removed after migration)
GEMINI_API_KEY=...
```

---

## 7. Database Schema Overview

See `supabase/migrations/001_initial_schema.sql` for full DDL.

**Core Tables:**
### Database Tables (German — Supabase)

> All tables use German naming. The schema exists in Supabase already.
> Additional columns added via `supabase/migrations/003_ergaenzungen.sql`.

- `benutzer` — User profiles (vorname, nachname, email, rolle: admin/kunde/mitarbeiter)
- `benutzer_adressen` — User addresses (strasse, plz, ort, land)
- `artikel` — Products (titel, slug, preis_brutto, rabattpreis, steuersatz, aktiv, SEO fields)
- `kategorien` — Categories (name, slug, parent_id for nesting)
- `marken` — Brands (name)
- `lagerbestaende` — Stock/inventory (bestand, mindestbestand)
- `artikel_bilder` — Product images (datei_id → medien_dateien, alt_text, anzeige_reihenfolge)
- `artikel_technische_daten` — Technical specs (schluessel, wert)
- `medien_dateien` — Uploaded files (speicherpfad, mime_type, groesse_bytes)
- `bestellungen` — Orders (bestellnummer, status, gesamt_brutto, notizen JSONB)
- `bestellpositionen` — Order line items (titel, menge, preis_brutto)
- `zahlungen` — Payments (stripe_payment_intent_id, status, betrag)
- `zahlungsvorgaenge` — Payment events log
- `buchungen` — Bookings (geplant_von, geplant_bis, status, erinnerung_gesendet)
- `dienstleistungen` — Services (code, name, basispreis_brutto, dauer_minuten)
- `techniker` — Technicians (vorname, nachname, aktiv)
- `techniker_verfuegbarkeit` — Technician availability (wochentag, start_zeit, ende_zeit)
- `gesperrte_tage` — Blocked dates (datum, grund, techniker_id)
- `firmeneinstellungen` — Company settings singleton (oeffnungszeiten JSONB, brand colors)
- `rechtstexte` — CMS content pages (slug, content_html, veröffentlicht)
- `inhalt_versionen` — Content version history
- `email_vorlagen` — Email templates (typ, betreff, inhalt_html, variablen)
- `admin_audit_logs` — Audit trail

### API Routes

| Route | Methods | Description |
| --- | --- | --- |
| `/api/products` | GET, POST | Product list + create |
| `/api/products/[id]` | GET, PUT, DELETE | Product CRUD |
| `/api/products/[id]/stock` | GET, PUT | Stock management |
| `/api/categories` | GET, POST, PUT, DELETE | Category CRUD |
| `/api/brands` | GET, POST | Brand CRUD |
| `/api/orders` | GET | Order list |
| `/api/orders/[id]` | GET, PUT | Order detail + status |
| `/api/bookings` | GET, POST | Booking list + create |
| `/api/bookings/[id]` | GET, PUT, DELETE | Booking CRUD |
| `/api/content` | GET | Content pages list |
| `/api/content/[slug]` | GET, PUT | Content page + versioning |
| `/api/settings` | GET, PUT | Company settings |
| `/api/services` | GET, POST, PUT, DELETE | Service CRUD |
| `/api/technicians` | GET, POST, PUT | Technician CRUD |
| `/api/email-templates` | GET, PUT | Email template management |
| `/api/upload` | POST | File upload to Supabase Storage |
| `/api/checkout` | POST | Stripe Checkout session creation |
| `/api/webhooks/stripe` | POST | Stripe webhook handler |
| `/api/availability` | GET | Available time slots |
| `/api/blocked-dates` | GET, POST, DELETE | Blocked dates CRUD |
| `/api/cron/booking-reminders` | GET | Daily booking reminder cron |

---

## 8. Deployment Notes (Vercel)

1. Remove `output: 'standalone'` from `next.config.ts` (not needed on Vercel).
2. Set all env variables in Vercel Dashboard → Settings → Environment Variables.
3. Configure `vercel.json` for cron jobs (booking reminders).
4. Point Stripe webhook endpoint to `https://your-domain.com/api/webhooks/stripe`.
5. Configure Supabase → Auth → URL Configuration with your Vercel domain.
6. Add Vercel domain to `next.config.ts` `images.remotePatterns` for Supabase Storage URLs.
7. Run `003_ergaenzungen.sql` in Supabase SQL Editor before deploying.

