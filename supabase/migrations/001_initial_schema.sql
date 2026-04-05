-- ============================================
-- Said Kälte- & Klimatechnik — Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CATEGORIES
-- ============================================
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. PRODUCTS
-- ============================================
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  brand TEXT,
  type TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_price NUMERIC(10,2),
  stock INTEGER NOT NULL DEFAULT 0,
  energy_efficiency TEXT,
  room_size TEXT,
  noise_level TEXT,
  cooling_capacity TEXT,
  heating_capacity TEXT,
  dimensions TEXT,
  weight TEXT,
  refrigerant TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'hidden')),
  meta_title TEXT,
  meta_description TEXT,
  meta_tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. PRODUCT ↔ CATEGORY (many-to-many)
-- ============================================
CREATE TABLE product_categories (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

-- ============================================
-- 4. PRODUCT IMAGES
-- ============================================
CREATE TABLE product_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. PRODUCT VARIANTS
-- ============================================
CREATE TABLE product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_type TEXT NOT NULL,      -- e.g. 'Größe', 'Farbe'
  variant_value TEXT NOT NULL,     -- e.g. '3.5 kW', 'Weiß'
  price_modifier NUMERIC(10,2) DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 6. ORDERS
-- ============================================
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address JSONB,
  items_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'bezahlt', 'versendet', 'storniert')),
  payment_method TEXT,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  notes JSONB DEFAULT '[]'::jsonb,  -- Array of {text, created_at, author}
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 7. ORDER ITEMS
-- ============================================
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 8. BOOKINGS
-- ============================================
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  service_type TEXT NOT NULL,
  date DATE NOT NULL,
  time_slot_start TIME NOT NULL,
  time_slot_end TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'angefragt' CHECK (status IN ('angefragt', 'bestaetigt', 'storniert', 'abgeschlossen')),
  technician TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 9. TIME SLOTS (configurable availability)
-- ============================================
CREATE TABLE time_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Monday, 6=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 10. BLOCKED DATES (holidays, vacations)
-- ============================================
CREATE TABLE blocked_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 11. CONTENT PAGES (CMS)
-- ============================================
CREATE TABLE content_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content JSONB,               -- Tiptap JSON document
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('published', 'draft')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- ============================================
-- 12. CONTENT VERSIONS (history)
-- ============================================
CREATE TABLE content_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES content_pages(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  version_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT
);

-- ============================================
-- 13. COMPANY SETTINGS (singleton)
-- ============================================
CREATE TABLE company_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'Said Kälte- und Klimatechnik',
  phone TEXT DEFAULT '0800 123 4567',
  email TEXT DEFAULT 'info@said-klima.de',
  street TEXT DEFAULT 'Musterstraße 123',
  zip TEXT DEFAULT '10115',
  city TEXT DEFAULT 'Berlin',
  country TEXT DEFAULT 'Deutschland',
  opening_hours JSONB DEFAULT '[
    {"day": "Montag",     "open": "08:00", "close": "18:00", "is_open": true},
    {"day": "Dienstag",   "open": "08:00", "close": "18:00", "is_open": true},
    {"day": "Mittwoch",   "open": "08:00", "close": "18:00", "is_open": true},
    {"day": "Donnerstag", "open": "08:00", "close": "18:00", "is_open": true},
    {"day": "Freitag",    "open": "08:00", "close": "18:00", "is_open": true},
    {"day": "Samstag",    "open": "09:00", "close": "14:00", "is_open": true},
    {"day": "Sonntag",    "open": "",      "close": "",      "is_open": false}
  ]'::jsonb,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563EB',
  secondary_color TEXT DEFAULT '#0F172A',
  accent_color TEXT DEFAULT '#3B82F6',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 14. EMAIL TEMPLATES
-- ============================================
CREATE TABLE email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL UNIQUE CHECK (type IN ('booking_confirmation', 'booking_reminder', 'booking_cancellation', 'order_confirmation', 'order_status_update')),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_number ON bookings(booking_number);
CREATE INDEX idx_content_pages_slug ON content_pages(slug);
CREATE INDEX idx_content_versions_page ON content_versions(page_id);

-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_products
  BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_bookings
  BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_content_pages
  BEFORE UPDATE ON content_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_company_settings
  BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_email_templates
  BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ policies (for the storefront)
CREATE POLICY "Public can read active products" ON products
  FOR SELECT USING (status = 'active');

CREATE POLICY "Public can read categories" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Public can read product_categories" ON product_categories
  FOR SELECT USING (true);

CREATE POLICY "Public can read product images" ON product_images
  FOR SELECT USING (true);

CREATE POLICY "Public can read product variants" ON product_variants
  FOR SELECT USING (true);

CREATE POLICY "Public can read published content" ON content_pages
  FOR SELECT USING (status = 'published');

CREATE POLICY "Public can read company settings" ON company_settings
  FOR SELECT USING (true);

CREATE POLICY "Public can read time slots" ON time_slots
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can read blocked dates" ON blocked_dates
  FOR SELECT USING (true);

-- PUBLIC INSERT policies (checkout, bookings)
CREATE POLICY "Public can create bookings" ON bookings
  FOR INSERT WITH CHECK (true);

-- AUTHENTICATED ADMIN policies (full access)
-- These use the service_role key which bypasses RLS,
-- but we also add policies for authenticated users with admin role.
CREATE POLICY "Admins have full access to products" ON products
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access to categories" ON categories
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access to product_categories" ON product_categories
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access to product_images" ON product_images
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access to product_variants" ON product_variants
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access to orders" ON orders
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access to order_items" ON order_items
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access to bookings" ON bookings
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access to time_slots" ON time_slots
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access to blocked_dates" ON blocked_dates
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access to content_pages" ON content_pages
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access to content_versions" ON content_versions
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access to company_settings" ON company_settings
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access to email_templates" ON email_templates
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

