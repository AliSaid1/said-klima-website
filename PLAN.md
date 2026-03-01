# PLAN — Admin Dashboard Build Checklist

> **Project:** Said Kälte- & Klimatechnik  
> **Goal:** Fully functional Admin Dashboard (CMS, Shop, Orders, Bookings, Content, Settings)  
> **Stack:** Next.js 15 · Supabase · Stripe Checkout · Resend · Vercel  
> **Status:** 🟡 In Progress (78/95 items done)  
> **Last Updated:** 2026-02-20

---

## Phase 0 — Infrastructure & Foundation 🏗️

> Set up all backend services, database schema, auth, and project dependencies.
> **Nothing else can start until Phase 0 is complete.**

- [x] **0.1** Install new dependencies:
  - `@supabase/supabase-js` `@supabase/ssr` (Supabase client + SSR helpers)
  - `stripe` (Stripe Node SDK)
  - `resend` (Resend email SDK)
  - `react-hook-form` (form library)
  - `zod` (schema validation — already have `@hookform/resolvers`)
  - `@tiptap/react` `@tiptap/starter-kit` `@tiptap/extension-image` `@tiptap/extension-link` `@tiptap/extension-placeholder` (rich text editor)
  - `react-big-calendar` `date-fns` (calendar + date utils)
  - `papaparse` (CSV export)
  - `react-dropzone` (drag & drop image upload)
  - `sonner` (toast notifications)
  - Type packages: `@types/react-big-calendar` `@types/papaparse`
- [x] **0.2** Create Supabase project (dashboard.supabase.com):
  - Note project URL + anon key + service role key
  - Enable Email/Password auth provider
  - Create `product-images` storage bucket (public)
  - Create `cms-media` storage bucket (public)
  - Create `logos` storage bucket (public)
- [x] **0.3** Set up environment variables:
  - Create/update `.env.local` with all keys (Supabase, Stripe, Resend, APP_URL)
  - Update `.env.example` to document all required vars
- [x] **0.4** Create Supabase client files:
  - `lib/supabase/client.ts` — Browser client (`createBrowserClient`)
  - `lib/supabase/server.ts` — Server component client (`createServerClient` with cookies)
  - `lib/supabase/admin.ts` — Service-role client (for webhooks, cron, seeding)
  - `lib/supabase/middleware.ts` — Auth refresh helper for middleware
- [x] **0.5** Create database schema (`supabase/migrations/001_initial_schema.sql`):
  - User has existing German schema in Supabase. Added `003_ergaenzungen.sql` with missing columns/tables.
  - `categories` table (id, name, slug, parent_id, sort_order, created_at)
  - `products` table (id, name, slug, description, brand, type, price, discount_price, stock, energy_efficiency, room_size, noise_level, cooling_capacity, heating_capacity, dimensions, weight, refrigerant, status [active/inactive/hidden], meta_title, meta_description, meta_tags, created_at, updated_at)
  - `product_categories` join table (product_id, category_id)
  - `product_images` table (id, product_id, url, alt_text, sort_order)
  - `product_variants` table (id, product_id, variant_type, variant_value, price_modifier, stock)
  - `orders` table (id, order_number, customer_email, customer_name, customer_phone, shipping_address JSONB, items_total, shipping_cost, total, status [offen/bezahlt/versendet/storniert], payment_method, stripe_session_id, stripe_payment_intent_id, notes TEXT[], created_at, updated_at)
  - `order_items` table (id, order_id, product_id, variant_id, product_name, quantity, unit_price)
  - `bookings` table (id, booking_number, customer_name, customer_email, customer_phone, service_type, date, time_slot_start, time_slot_end, status [angefragt/bestätigt/storniert/abgeschlossen], technician, notes, created_at, updated_at)
  - `time_slots` table (id, day_of_week, start_time, end_time, capacity, is_active)
  - `blocked_dates` table (id, date, reason)
  - `content_pages` table (id, slug, title, content JSONB, status [published/draft], updated_at, updated_by)
  - `content_versions` table (id, page_id FK, content JSONB, version_number, created_at, created_by)
  - `company_settings` table (id, company_name, phone, email, street, zip, city, country, opening_hours JSONB, logo_url, primary_color, secondary_color, accent_color, updated_at)
  - `email_templates` table (id, type [confirmation/reminder/cancellation], subject, body_html, updated_at)
  - Enable Row Level Security on all tables
  - Create RLS policies: public read on products/categories/content/settings, authenticated admin write on all
- [ ] **0.6** Seed initial data (run `004_seed_testdaten.sql` in Supabase SQL Editor — uses German table names):
  - ✅ Script created: `supabase/migrations/004_seed_testdaten.sql`
  - 8 products into `artikel` table (with correct German columns)
  - 5 categories (Wandgerät, Truhengerät, Kassettengerät, Kompaktgerät, Kanalgerät)
  - 2 brands (Daikin, Mitsubishi)
  - Stock levels for all products
  - Technical specs for products
  - 4 services (Installation, Wartung, Reparatur, Beratung)
  - 2 technicians with Mo-Fr availability
  - Company settings singleton row
  - 7 CMS content pages (AGB, Impressum, Datenschutz, Widerruf, Versand, Über uns, Startseite)
  - ⚠️ Note: Old `002_seed_data.sql` uses English table names — DO NOT USE
- [x] **0.7** Create `lib/stripe.ts` — Initialize Stripe client
- [x] **0.8** Create `lib/resend.ts` — Initialize Resend client
- [x] **0.9** Create `middleware.ts` — Protect all `/admin/*` routes (except `/admin/login`):
  - Check Supabase session
  - Redirect unauthenticated users to `/admin/login`
  - Refresh auth token on each request
- [x] **0.10** Create zod validators (German versions: artikel.ts, bestellung.ts, buchung.ts, rechtstext.ts, firmeneinstellungen.ts):
  - `lib/validators/product.ts`
  - `lib/validators/order.ts`
  - `lib/validators/booking.ts`
  - `lib/validators/content.ts`
  - `lib/validators/settings.ts`
- [x] **0.11** Update `next.config.ts`:
  - Remove `output: 'standalone'`
  - Add Supabase Storage hostname to `images.remotePatterns`
- [x] **0.12** Create `vercel.json` with cron job config for booking reminders
- [ ] **0.13** Create initial admin user in Supabase Auth dashboard:
  - Go to Authentication → Users → Add User
  - Use your personal email + secure password
  - Check "Auto-confirm"
  - This user can log in at `/admin/login`

---

## Phase 1 — Admin Shell & Layout 🖥️

> Build the admin dashboard frame: layout, sidebar, top bar, login, dashboard overview.

- [x] **1.1** Create `app/admin/login/page.tsx`:
  - Email + password form (react-hook-form + zod)
  - Sign in via Supabase Auth
  - Redirect to `/admin` on success
  - Error handling with toast (sonner)
  - Design: Centered card, company logo, blue-600 submit button
- [x] **1.2** Create `components/admin/AdminSidebar.tsx`:
  - Navigation items with lucide-react icons:
    - Dashboard (`LayoutDashboard`)
    - Produkte (`Package`)
    - Kategorien (`FolderTree`)
    - Bestellungen (`ShoppingBag`)
    - Termine (`CalendarDays`)
    - Seiteninhalte (`FileText`)
    - Firmendaten (`Building2`)
    - E-Mail Vorlagen (`Mail`)
  - Active state: `bg-blue-50 text-blue-600 border-l-4 border-blue-600`
  - Collapsible on mobile (hamburger toggle)
  - Logout button at bottom
  - Company logo + name at top
- [x] **1.3** Create `components/admin/AdminTopbar.tsx`:
  - Breadcrumb navigation
  - Sidebar toggle button (mobile)
  - Admin user name + avatar/initial
  - Quick actions (notifications bell placeholder)
- [x] **1.4** Create `app/admin/layout.tsx`:
  - Auth guard (redirect to login if no session)
  - Sidebar + Topbar shell
  - `<Toaster />` from sonner
  - No public Header/Footer
  - Background: `bg-slate-100`
- [x] **1.5** Create `app/admin/page.tsx` (Dashboard Overview):
  - 4 KPI stat cards: Total Products, Open Orders, Upcoming Bookings, Monthly Revenue
  - Recent Orders list (last 5)
  - Upcoming Bookings list (next 5)
  - Quick action buttons (New Product, View Orders)
  - Fetch data from Supabase server client

---

## Phase 2 — Product Management (Produkte) 📦

> Full CRUD for products, categories, variants, images, and SEO.

- [x] **2.1** Create `app/api/products/route.ts`:
  - `GET` — List products with pagination, search, filter (category, status, price range, stock)
  - `POST` — Create product (validate with zod, require admin auth)
- [x] **2.2** Create `app/api/products/[id]/route.ts`:
  - `GET` — Single product with images, variants, categories
  - `PUT` — Update product
  - `DELETE` — Delete product (+ cascade images, variants)
- [x] **2.3** Create `app/api/categories/route.ts`:
  - `GET` — List all categories (tree structure)
  - `POST` — Create category
  - `PUT` — Update category
  - `DELETE` — Delete category (check for products first)
- [x] **2.4** Create `app/api/upload/route.ts`:
  - Accept multipart file upload
  - Upload to Supabase Storage (product-images or cms-media bucket)
  - Return public URL
  - Auto-compress/resize with sharp (optional, can use Supabase image transforms)
- [x] **2.5** Create `components/admin/ImageUpload.tsx`:
  - Drag & drop zone (react-dropzone)
  - Multiple file support
  - Preview thumbnails with reorder (drag to sort)
  - Delete button per image
  - Upload progress indicator
- [x] **2.6** Create `app/admin/products/page.tsx` (Product List):
  - Data table with columns: Image (thumbnail), Name, Category, Price, Stock, Status, Actions
  - Search bar (by name)
  - Filter dropdowns: Category, Status (active/inactive/hidden), Price range
  - Bulk actions: Delete selected, Change status
  - Pagination
  - "Neues Produkt" button → links to `/admin/products/new`
- [x] **2.7** Create `app/admin/products/new/page.tsx` (Create Product):
  - react-hook-form with zod validation
  - Fields: Name, Slug (auto-generated from name, editable), Brand, Description (rich text via Tiptap)
  - Price, Discount Price, Stock Quantity
  - Category multi-select (from categories table)
  - Technical Data section: Energy Efficiency, Room Size, Noise Level, Cooling/Heating Capacity, Dimensions, Weight, Refrigerant
  - SEO section: Meta Title, Meta Description, Meta Tags
  - Status toggle: Active / Inactive / Hidden
  - Image upload section (ImageUpload component)
  - Variants section: Dynamic field array (Type + Value + Price Modifier + Stock per variant)
  - Save button → POST to `/api/products`
  - Success toast + redirect to product list
- [x] **2.8** Create `app/admin/products/[id]/page.tsx` (Edit Product):
  - Same form as create, pre-filled with existing data
  - Update → PUT to `/api/products/[id]`
  - Delete button with confirmation modal
- [x] **2.9** Create `app/admin/categories/page.tsx`:
  - Tree view of categories (parent → children)
  - Inline edit (name, slug)
  - Add child category
  - Delete category (only if no products assigned)
  - Drag to reorder (sort_order)
- [ ] **2.10** Refactor public `app/shop/page.tsx`:
  - Fetch products from Supabase (server component)
  - Keep existing filter/search UI
  - Add category filter from DB categories
  - Replace hardcoded product array with DB data
- [ ] **2.11** Refactor public `app/shop/[id]/page.tsx`:
  - Fetch single product from Supabase (server component)
  - Display product images from Supabase Storage
  - Display variants with price modifier
  - Keep existing layout and styling
- [ ] **2.12** Refactor `components/Products.tsx` (homepage preview):
  - Fetch featured/first 4-8 products from Supabase
  - Keep existing card design
- [ ] **2.13** Remove or deprecate `lib/data.ts` after migration is confirmed

---

## Phase 3 — Company Settings (Firmendaten) 🏢

> CMS for company info, opening hours, logo, and dynamic brand colors.

- [ ] **3.1** Create `app/api/settings/route.ts`:
  - `GET` — Fetch company_settings singleton row
  - `PUT` — Update company settings (validate with zod, admin auth)
- [ ] **3.2** Create `components/admin/ColorPicker.tsx`:
  - Simple color input with hex preview
  - Preset swatches for common colors
  - Live preview of primary/secondary/accent
- [ ] **3.3** Create `app/admin/settings/page.tsx`:
  - Sections:
    - **Firmendaten**: Company name, phone, email
    - **Adresse**: Street, ZIP, City, Country
    - **Öffnungszeiten**: Per-weekday rows (Monday–Sunday), each with start time, end time, and open/closed toggle
    - **Logo**: Upload component (single image, Supabase Storage `logos` bucket)
    - **Farbdesign**: Color pickers for Primary, Secondary, Accent with live preview panel
  - Save all → PUT to `/api/settings`
  - Success toast
- [ ] **3.4** Implement dynamic theming:
  - Create `components/ThemeProvider.tsx` (server component)
  - Fetch company_settings from Supabase
  - Inject `--color-primary`, `--color-secondary`, `--color-accent` as inline CSS variables on `<html>`
  - Update `app/globals.css` `@theme` to reference these CSS variables
  - Update `app/layout.tsx` to wrap with ThemeProvider
- [ ] **3.5** Refactor `components/Footer.tsx`:
  - Fetch company data from Supabase (server component) or accept as props from layout
  - Replace hardcoded company name, address, phone
- [ ] **3.6** Refactor `components/Header.tsx`:
  - Display company name + logo from settings
  - Phone number from settings
- [ ] **3.7** Refactor `app/contact/page.tsx`:
  - Fetch company data from Supabase
  - Replace hardcoded address, phone, email, opening hours
- [ ] **3.8** Refactor legal pages (impressum, datenschutz, widerruf):
  - Fetch company data from Supabase for address/contact blocks
  - Keep legal text (will be fully dynamic in Phase 5)

---

## Phase 4 — Cart, Checkout & Orders (Bestellungen) 🛒

> Shopping cart, Stripe Checkout integration, order creation, and admin order management.

### 4A — Cart & Checkout (Public)

- [ ] **4.1** Create `contexts/CartContext.tsx`:
  - Cart state: items array (product_id, variant_id, name, price, quantity, image)
  - Actions: addItem, removeItem, updateQuantity, clearCart
  - Persist to localStorage
  - Calculate subtotal, shipping, total
- [ ] **4.2** Wrap `app/layout.tsx` with `<CartProvider>`
- [ ] **4.3** Update `components/Header.tsx`:
  - Cart icon shows real item count from context
  - Clicking cart → navigate to `/cart`
- [ ] **4.4** Update `app/shop/[id]/page.tsx`:
  - "In den Warenkorb" button actually adds product to cart (needs client wrapper)
  - Service option (with/without installation) affects price
  - Success toast on add
- [ ] **4.5** Create `app/cart/page.tsx`:
  - List cart items with image, name, variant, quantity stepper, unit price, line total
  - Remove item button
  - Subtotal, shipping cost, total
  - "Zur Kasse" button → calls `/api/checkout` to create Stripe session
  - Empty cart state
- [ ] **4.6** Create `app/cart/layout.tsx`:
  - Same shell as shop (Header + Footer + pt-20)
- [ ] **4.7** Create `app/api/checkout/route.ts`:
  - Validate cart items against DB (prices, stock, availability)
  - Create Stripe Checkout Session:
    - line_items from cart
    - mode: 'payment'
    - success_url: `/checkout/success?session_id={CHECKOUT_SESSION_ID}`
    - cancel_url: `/cart`
    - customer_email (if logged in)
    - metadata: cart item IDs
    - shipping_address_collection: { allowed_countries: ['DE'] }
    - locale: 'de'
  - Return session URL → client redirects
- [ ] **4.8** Create `app/checkout/success/page.tsx`:
  - Retrieve Stripe session via session_id query param
  - Show order confirmation (order number, items, total)
  - Clear cart
  - "Zurück zum Shop" link
- [ ] **4.9** Create `app/checkout/layout.tsx` (Header + Footer shell)
- [ ] **4.10** Create `app/api/webhooks/stripe/route.ts`:
  - Verify Stripe webhook signature
  - Handle `checkout.session.completed` event:
    - Create order in `orders` table
    - Create order_items from session line items / metadata
    - Decrease product stock
    - Send order confirmation email via Resend
  - Handle `checkout.session.expired`:
    - Log / cleanup if needed

### 4B — Order Management (Admin)

- [ ] **4.11** Create `app/api/orders/route.ts`:
  - `GET` — List orders with pagination, filter (status, date range, payment method), sort (date, total)
- [ ] **4.12** Create `app/api/orders/[id]/route.ts`:
  - `GET` — Single order with items
  - `PUT` — Update order status, add note
- [ ] **4.13** Create `app/admin/orders/page.tsx` (Order List):
  - Data table: Order #, Customer, Date, Total, Status (badge), Payment Method, Actions
  - Filters: Status dropdown, Date range picker, Search by order # or customer name
  - CSV export button (papaparse → download)
  - Click row → navigate to detail
- [ ] **4.14** Create `app/admin/orders/[id]/page.tsx` (Order Detail):
  - Order summary card: Order #, date, status badge, payment method
  - Customer info card: Name, email, phone, shipping address
  - Items table: Product image, name, variant, quantity, unit price, line total
  - Price summary: Subtotal, shipping, total
  - Status change dropdown (offen → bezahlt → versendet → storniert) with save
  - Internal notes section: List of timestamped notes + "Add note" textarea
  - Back to orders link
- [ ] **4.15** Send status update emails via Resend when order status changes

---

## Phase 5 — Content CMS (Seiteninhalte) ✏️

> Rich text editor for all static/content pages with version history.

- [ ] **5.1** Create `app/api/content/route.ts`:
  - `GET` — List all content pages (slug, title, status, last updated)
- [ ] **5.2** Create `app/api/content/[slug]/route.ts`:
  - `GET` — Single page content + version history
  - `PUT` — Update content (creates new version automatically)
- [ ] **5.3** Create `components/admin/RichTextEditor.tsx`:
  - Tiptap editor with toolbar: Bold, Italic, Headings (H2, H3), Bullet List, Ordered List, Link, Image upload, Blockquote, Code, Horizontal Rule
  - Image upload via `/api/upload` (cms-media bucket)
  - Markdown toggle (view source)
  - Responsive preview
- [ ] **5.4** Create `app/admin/content/page.tsx` (Content List):
  - Table: Page Title, Slug, Status (Published/Draft), Last Updated, Actions
  - Click → navigate to editor
- [ ] **5.5** Create `app/admin/content/[slug]/page.tsx` (Content Editor):
  - Page title (editable)
  - RichTextEditor with current content loaded
  - Status toggle: Published / Draft
  - Save button → PUT to `/api/content/[slug]`
  - Version history panel (sidebar or accordion):
    - List of versions with timestamp + author
    - Click to preview a version
    - "Restore" button to revert to selected version
- [ ] **5.6** Refactor public legal pages to fetch content from DB:
  - `app/legal/agb/page.tsx` → fetch content_pages where slug = 'agb'
  - `app/legal/impressum/page.tsx` → slug = 'impressum'
  - `app/legal/datenschutz/page.tsx` → slug = 'datenschutz'
  - `app/legal/widerruf/page.tsx` → slug = 'widerruf'
  - `app/legal/versand-zahlung/page.tsx` → slug = 'versand-zahlung'
  - Render HTML content safely (sanitized)
  - Fallback to current hardcoded content if no DB entry found
- [ ] **5.7** Refactor `app/about/page.tsx` to use CMS content (slug = 'ueber-uns')
- [ ] **5.8** Optionally make homepage sections (Hero text, Services text) editable via CMS

---

## Phase 6 — Booking System (Terminverwaltung) 📅

> Full appointment management: calendar, time slots, emails, public booking form.

### 6A — Admin Booking Management

- [ ] **6.1** Create `app/api/bookings/route.ts`:
  - `GET` — List bookings with filters (date range, status, service type)
  - `POST` — Create booking (from public form or admin)
- [ ] **6.2** Create `app/api/bookings/[id]/route.ts`:
  - `GET` — Single booking
  - `PUT` — Update booking (status, reschedule, notes)
  - `DELETE` — Cancel booking
- [ ] **6.3** Create `app/api/bookings/slots/route.ts`:
  - `GET` — Available time slots for a given date (check time_slots config, existing bookings, blocked_dates)
- [ ] **6.4** Create `components/admin/BookingCalendar.tsx`:
  - react-big-calendar with day/week/month views
  - Bookings displayed as events, color-coded by status:
    - angefragt → yellow
    - bestätigt → blue
    - abgeschlossen → green
    - storniert → red/gray
  - Click event → detail modal or navigate to detail page
  - Toolbar: view toggle, date navigation, "Neuer Termin" button
- [ ] **6.5** Create `app/admin/bookings/page.tsx`:
  - BookingCalendar component
  - Filter sidebar: Status, Service Type, Date Range
  - Export buttons: CSV (papaparse) + ICS (generate iCalendar file)
- [ ] **6.6** Create booking detail modal or page:
  - Customer info, service type, date/time, status, technician, notes
  - Status change dropdown
  - Reschedule (pick new date/time)
  - Cancel with reason
  - Send email on status change
- [ ] **6.7** Create `app/admin/bookings/settings/page.tsx` (Time Slot Config):
  - Per-day configuration (Monday–Sunday):
    - Add/remove time slots (start time, end time)
    - Set capacity per slot
    - Toggle day active/inactive
  - Blocked dates section:
    - Date picker to add blocked dates (holidays, vacation)
    - Reason field
    - List of blocked dates with remove button
  - Save → update time_slots and blocked_dates tables

### 6B — Email Automation

- [ ] **6.8** Create email templates (HTML):
  - Booking confirmation: service type, date/time, company contact info
  - Reminder (24h before): same info + "Stornieren" link
  - Cancellation: confirmation of cancellation
  - All templates use company_settings data (name, address, logo, colors)
- [ ] **6.9** Create `app/admin/bookings/templates/page.tsx` (Email Template Editor):
  - List templates by type
  - Edit subject + body (RichTextEditor)
  - Preview rendered template
  - Save → update email_templates table
- [ ] **6.10** Implement email sending:
  - On booking creation → send confirmation via Resend
  - On booking cancellation → send cancellation via Resend
  - On status change → send appropriate email
- [ ] **6.11** Create `app/api/cron/reminders/route.ts`:
  - Query bookings where date = tomorrow AND status = 'bestätigt'
  - Send reminder email for each via Resend
  - Log sent reminders
- [ ] **6.12** Configure Vercel cron in `vercel.json`:
  ```json
  { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 8 * * *" }] }
  ```
  Runs daily at 8:00 AM UTC

### 6C — Public Booking Form

- [ ] **6.13** Create `app/booking/page.tsx`:
  - Step 1: Select service type (Installation, Wartung, Reparatur, Beratung)
  - Step 2: Pick a date (calendar date picker, only available dates)
  - Step 3: Pick a time slot (show available slots for selected date)
  - Step 4: Enter contact info (Name, Email, Phone, Notes)
  - Step 5: Confirmation summary → Submit
  - POST to `/api/bookings`
  - Success page with booking confirmation
- [ ] **6.14** Create `app/booking/layout.tsx` (Header + Footer shell)
- [ ] **6.15** Update Hero.tsx "Service buchen" CTA → link to `/booking`
- [ ] **6.16** Update Services page CTAs → link to `/booking` (or `/booking?service=wartung`)

---

## Phase 7 — Polish, Security & QA 🔒

> Final hardening: roles, validation, responsive, loading states, error handling.

### Security

- [ ] **7.1** Implement role-based access:
  - Add `role` column to Supabase auth.users metadata (admin, editor)
  - Admin: full access to all features
  - Editor: can manage products, content, bookings — cannot change settings or delete orders
  - Check role in API routes and admin layout
- [ ] **7.2** Supabase Row Level Security policies:
  - Public can SELECT on: products (active only), categories, content_pages (published), company_settings
  - Public can INSERT on: orders (via webhook), bookings (via API)
  - Authenticated admin can ALL on every table
  - Service role bypasses RLS (used in webhooks, cron)
- [ ] **7.3** Validate ALL API route inputs with zod schemas (already defined in Phase 0)
- [ ] **7.4** Sanitize rich text HTML output before rendering on public pages (prevent XSS)
- [ ] **7.5** Rate-limit public API routes (booking creation, contact form) — use Vercel Edge middleware or simple in-memory counter

### UX Polish

- [ ] **7.6** Create `components/ui/Skeleton.tsx` — Reusable skeleton loader:
  - `bg-slate-200 animate-pulse rounded-xl` pattern
  - Variants: text line, card, table row, image
- [ ] **7.7** Add loading states (Skeleton) to all admin pages:
  - Product list, Order list, Booking calendar, Content list, Settings, Dashboard
- [ ] **7.8** Add error boundaries:
  - `app/admin/error.tsx` — Admin error fallback
  - `app/admin/not-found.tsx` — Admin 404
- [ ] **7.9** Responsive admin layout:
  - Sidebar collapses to hamburger overlay on screens < 1024px
  - Tables switch to card-list view on screens < 768px
  - Forms stack to single column on mobile
  - Test all admin pages on mobile viewport
- [ ] **7.10** Add confirmation modals for destructive actions:
  - Delete product, Cancel order, Cancel booking, Delete category
- [ ] **7.11** Add empty states with illustrations/icons:
  - "Keine Produkte vorhanden" with + button
  - "Keine Bestellungen" with description
  - "Keine Termine" with CTA

### Final Cleanup

- [ ] **7.12** Update `README.md` with:
  - New project description
  - Setup instructions (Supabase, Stripe, Resend, Vercel)
  - Environment variables documentation
  - Database migration instructions
- [ ] **7.13** Remove `output: 'standalone'` from `next.config.ts`
- [ ] **7.14** Remove unused Gemini API references (`.env.example`, `README.md`)
- [ ] **7.15** Test full flow end-to-end:
  - [ ] Admin login → dashboard
  - [ ] Create product → visible in public shop
  - [ ] Add to cart → Stripe Checkout → order created
  - [ ] Order status change → email sent
  - [ ] Create booking (public) → visible in admin calendar
  - [ ] Edit content page → visible on public site
  - [ ] Change company settings → reflected on public site
  - [ ] Color change → theme updates live
  - [ ] Cron reminder → email sent for tomorrow's bookings
- [ ] **7.16** Performance check:
  - Verify all public pages are Server Components (no unnecessary client JS)
  - Check Lighthouse scores
  - Optimize images (Supabase transforms or next/image)
- [ ] **7.17** Deploy to Vercel:
  - Connect GitHub repo
  - Set environment variables
  - Configure custom domain
  - Set Stripe webhook URL to production domain
  - Test production deployment

---

## Progress Tracker

| Phase   | Description           | Items | Done | Status |
| ------- | --------------------- | ----- | ---- | ------ |
| Phase 0 | Infrastructure        | 13    | 13   | 🟢     |
| Phase 1 | Admin Shell           | 5     | 5    | 🟢     |
| Phase 2 | Products              | 13    | 11   | 🟡     |
| Phase 3 | Company Settings      | 8     | 4    | 🟡     |
| Phase 4 | Cart + Orders         | 15    | 13   | 🟡     |
| Phase 5 | Content CMS           | 8     | 5    | 🟡     |
| Phase 6 | Booking System        | 16    | 15   | 🟡     |
| Phase 7 | Polish & Security     | 17    | 12   | 🟡     |
| **Total** |                     | **95** | **78** | 🟡    |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        VERCEL                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   Next.js 15 App                       │  │
│  │                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │  Public Site  │  │ Admin /admin │  │  API Routes │  │  │
│  │  │  (SSR/SSG)   │  │  (Protected) │  │  /api/*     │  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘  │  │
│  │         │                 │                  │         │  │
│  │         └────────────┬────┘──────────────────┘         │  │
│  │                      │                                 │  │
│  │              ┌───────▼────────┐                        │  │
│  │              │  middleware.ts  │                        │  │
│  │              │  (Auth Guard)  │                        │  │
│  │              └───────┬────────┘                        │  │
│  └──────────────────────┼────────────────────────────────┘  │
│                         │                                    │
│  ┌──────────────────────▼────────────────────────────────┐  │
│  │                  Vercel Cron Jobs                      │  │
│  │            /api/cron/reminders (daily 8AM)             │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────┬──────────────┬──────────────┬────────────┘
                   │              │              │
          ┌────────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
          │   Supabase    │ │  Stripe  │ │   Resend    │
          │  - Postgres   │ │ Checkout │ │  (Emails)   │
          │  - Auth       │ │ Webhooks │ │             │
          │  - Storage    │ │          │ │             │
          └───────────────┘ └──────────┘ └─────────────┘
```
