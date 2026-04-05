-- ============================================
-- MIGRATION 012: RLS Policy Cleanup & Enforcement
--
-- STRATEGY:
--   • service_role key (admin API routes) → bypasses RLS entirely — no policies needed
--   • anon key (public storefront) → public SELECT on product/content data
--   • authenticated JWT (customers) → own data only (orders, bookings, addresses)
--   • All previous "auth.role() = 'authenticated'" admin-write policies are REMOVED —
--     they were incorrect and allowed any logged-in customer to modify all data.
--
-- Run this in the Supabase SQL Editor.
-- Safe to run multiple times (all DROP IF EXISTS before CREATE).
-- ============================================

-- ─── STEP 1: Enable RLS on tables not yet protected ─────────────────────────
ALTER TABLE zahlungen              ENABLE ROW LEVEL SECURITY;
ALTER TABLE zahlungsvorgaenge      ENABLE ROW LEVEL SECURITY;
ALTER TABLE buchung_dienstleistungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs       ENABLE ROW LEVEL SECURITY;
-- (Other tables already have RLS from migrations 003, 007, 008)

-- ─── STEP 2: Remove all incorrect admin-write policies ───────────────────────
-- These were created in migrations 003 and 008 using auth.role() = 'authenticated'
-- which incorrectly allowed ANY logged-in customer to INSERT/UPDATE/DELETE admin data.
-- The admin API routes use the service_role key which bypasses RLS entirely.
DO $$
DECLARE
  tbl  TEXT;
  pol  TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'artikel', 'kategorien', 'marken', 'lagerbestaende',
    'artikel_bilder', 'artikel_technische_daten',
    'dienstleistungen', 'techniker', 'techniker_verfuegbarkeit',
    'buchungen', 'buchung_dienstleistungen',
    'bestellungen', 'bestellpositionen', 'zahlungen', 'zahlungsvorgaenge',
    'firmeneinstellungen', 'rechtstexte', 'inhalt_versionen',
    'email_vorlagen', 'medien_dateien', 'gesperrte_tage',
    'benutzer', 'benutzer_adressen',
    'admin_audit_logs'
  ])
  LOOP
    -- Pattern 1: "Auth kann <table> erstellen/aendern/loeschen" (migration 008)
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Auth kann ' || tbl || ' erstellen', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Auth kann ' || tbl || ' aendern', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Auth kann ' || tbl || ' loeschen', tbl);

    -- Pattern 2: "Admin Vollzugriff auf <table>" (migration 003)
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Admin Vollzugriff auf ' || tbl, tbl);

    -- Pattern 3: "Admins have full access to <table>" (migration 001 English schema)
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Admins have full access to ' || tbl, tbl);
  END LOOP;
END$$;


-- ════════════════════════════════════════════════════════════════════
-- PUBLIC READ POLICIES  (anon key — no authentication required)
-- ════════════════════════════════════════════════════════════════════

-- artikel: only active products visible to public
DROP POLICY IF EXISTS "Jeder kann aktive Artikel lesen" ON artikel;
DROP POLICY IF EXISTS "Oeffentlich: Aktive Artikel lesen" ON artikel;
CREATE POLICY "public_artikel_select" ON artikel
  FOR SELECT USING (aktiv = true);

-- kategorien
DROP POLICY IF EXISTS "Jeder kann Kategorien lesen" ON kategorien;
CREATE POLICY "public_kategorien_select" ON kategorien
  FOR SELECT USING (true);

-- marken
DROP POLICY IF EXISTS "Jeder kann Marken lesen" ON marken;
DROP POLICY IF EXISTS "Oeffentlich: Marken lesen" ON marken;
CREATE POLICY "public_marken_select" ON marken
  FOR SELECT USING (true);

-- lagerbestaende
DROP POLICY IF EXISTS "Jeder kann Lagerbestände lesen" ON lagerbestaende;
DROP POLICY IF EXISTS "Jeder kann Lagerbestaende lesen" ON lagerbestaende;
DROP POLICY IF EXISTS "Oeffentlich: Lagerbestaende lesen" ON lagerbestaende;
CREATE POLICY "public_lagerbestaende_select" ON lagerbestaende
  FOR SELECT USING (true);

-- artikel_bilder
DROP POLICY IF EXISTS "Jeder kann Artikel-Bilder lesen" ON artikel_bilder;
DROP POLICY IF EXISTS "Oeffentlich: Artikelbilder lesen" ON artikel_bilder;
CREATE POLICY "public_artikel_bilder_select" ON artikel_bilder
  FOR SELECT USING (true);

-- artikel_technische_daten
DROP POLICY IF EXISTS "Jeder kann Technische Daten lesen" ON artikel_technische_daten;
DROP POLICY IF EXISTS "Oeffentlich: Technische Daten lesen" ON artikel_technische_daten;
CREATE POLICY "public_artikel_technische_daten_select" ON artikel_technische_daten
  FOR SELECT USING (true);

-- dienstleistungen (only active services)
DROP POLICY IF EXISTS "Jeder kann Dienstleistungen lesen" ON dienstleistungen;
CREATE POLICY "public_dienstleistungen_select" ON dienstleistungen
  FOR SELECT USING (aktiv = true);

-- techniker (only active technicians — name + availability for booking UI)
DROP POLICY IF EXISTS "Jeder kann Techniker lesen" ON techniker;
CREATE POLICY "public_techniker_select" ON techniker
  FOR SELECT USING (aktiv = true);

-- techniker_verfuegbarkeit
DROP POLICY IF EXISTS "Jeder kann Verfuegbarkeit lesen" ON techniker_verfuegbarkeit;
CREATE POLICY "public_techniker_verfuegbarkeit_select" ON techniker_verfuegbarkeit
  FOR SELECT USING (verfuegbar = true);

-- gesperrte_tage
DROP POLICY IF EXISTS "Jeder kann gesperrte Tage lesen" ON gesperrte_tage;
CREATE POLICY "public_gesperrte_tage_select" ON gesperrte_tage
  FOR SELECT USING (true);

-- firmeneinstellungen
DROP POLICY IF EXISTS "Jeder kann Firmeneinstellungen lesen" ON firmeneinstellungen;
DROP POLICY IF EXISTS "Oeffentlich: Firmeneinstellungen lesen" ON firmeneinstellungen;
CREATE POLICY "public_firmeneinstellungen_select" ON firmeneinstellungen
  FOR SELECT USING (true);

-- rechtstexte (only published pages)
DROP POLICY IF EXISTS "Jeder kann veröffentlichte Rechtstexte lesen" ON rechtstexte;
DROP POLICY IF EXISTS "Oeffentlich: Rechtstexte lesen" ON rechtstexte;
CREATE POLICY "public_rechtstexte_select" ON rechtstexte
  FOR SELECT USING ("veröffentlicht" = true);

-- medien_dateien (product images are public)
DROP POLICY IF EXISTS "Jeder kann Medien lesen" ON medien_dateien;
CREATE POLICY "public_medien_dateien_select" ON medien_dateien
  FOR SELECT USING (true);

-- email_vorlagen: only readable by authenticated users (admin UI)
DROP POLICY IF EXISTS "Auth kann Email Vorlagen lesen" ON email_vorlagen;
CREATE POLICY "auth_email_vorlagen_select" ON email_vorlagen
  FOR SELECT USING (auth.role() = 'authenticated');


-- ════════════════════════════════════════════════════════════════════
-- CUSTOMER OWN-DATA POLICIES  (authenticated JWT — own rows only)
-- ════════════════════════════════════════════════════════════════════

-- ── benutzer ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Benutzer kann eigene Daten lesen" ON benutzer;
CREATE POLICY "customer_benutzer_select" ON benutzer
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Benutzer kann eigene Daten ändern" ON benutzer;
DROP POLICY IF EXISTS "Benutzer kann eigene Daten aendern" ON benutzer;
CREATE POLICY "customer_benutzer_update" ON benutzer
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auth trigger inserts into benutzer — must allow INSERT
DROP POLICY IF EXISTS "Trigger darf Benutzer erstellen" ON benutzer;
CREATE POLICY "system_benutzer_insert" ON benutzer
  FOR INSERT WITH CHECK (true);

-- ── benutzer_adressen ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Benutzer kann eigene Adressen lesen" ON benutzer_adressen;
CREATE POLICY "customer_adressen_select" ON benutzer_adressen
  FOR SELECT USING (auth.uid() = benutzer_id);

DROP POLICY IF EXISTS "Benutzer kann eigene Adressen erstellen" ON benutzer_adressen;
CREATE POLICY "customer_adressen_insert" ON benutzer_adressen
  FOR INSERT WITH CHECK (auth.uid() = benutzer_id);

DROP POLICY IF EXISTS "Benutzer kann eigene Adressen ändern" ON benutzer_adressen;
DROP POLICY IF EXISTS "Benutzer kann eigene Adressen aendern" ON benutzer_adressen;
CREATE POLICY "customer_adressen_update" ON benutzer_adressen
  FOR UPDATE USING (auth.uid() = benutzer_id) WITH CHECK (auth.uid() = benutzer_id);

DROP POLICY IF EXISTS "Benutzer kann eigene Adressen löschen" ON benutzer_adressen;
DROP POLICY IF EXISTS "Benutzer kann eigene Adressen loeschen" ON benutzer_adressen;
CREATE POLICY "customer_adressen_delete" ON benutzer_adressen
  FOR DELETE USING (auth.uid() = benutzer_id);


-- ════════════════════════════════════════════════════════════════════
-- CHECKOUT & BOOKING PUBLIC INSERT POLICIES
-- (The server validates and sanitises all data before inserting)
-- ════════════════════════════════════════════════════════════════════

-- ── bestellungen ──────────────────────────────────────────────────
-- Customers read their own orders; guests see nothing (they use order confirmation email)
DROP POLICY IF EXISTS "Benutzer kann eigene Bestellungen lesen" ON bestellungen;
CREATE POLICY "customer_bestellungen_select" ON bestellungen
  FOR SELECT USING (benutzer_id IS NOT NULL AND auth.uid() = benutzer_id);

-- Checkout (anon + authenticated) can create orders
DROP POLICY IF EXISTS "Jeder kann Bestellung erstellen" ON bestellungen;
CREATE POLICY "public_bestellungen_insert" ON bestellungen
  FOR INSERT WITH CHECK (true);

-- ── bestellpositionen ─────────────────────────────────────────────
-- Customers read line items belonging to their own orders
DROP POLICY IF EXISTS "Benutzer kann eigene Bestellpositionen lesen" ON bestellpositionen;
CREATE POLICY "customer_bestellpositionen_select" ON bestellpositionen
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bestellungen b
      WHERE b.id = bestellpositionen.bestellung_id
        AND b.benutzer_id = auth.uid()
    )
  );

-- Checkout server inserts line items (anon + authenticated)
DROP POLICY IF EXISTS "Jeder kann Bestellpositionen erstellen" ON bestellpositionen;
CREATE POLICY "public_bestellpositionen_insert" ON bestellpositionen
  FOR INSERT WITH CHECK (true);

-- ── buchungen ─────────────────────────────────────────────────────
-- Guest + authenticated users can create bookings
DROP POLICY IF EXISTS "Oeffentlich: Buchung erstellen" ON buchungen;
DROP POLICY IF EXISTS "Jeder kann Buchung erstellen" ON buchungen;
CREATE POLICY "public_buchungen_insert" ON buchungen
  FOR INSERT WITH CHECK (true);

-- Authenticated customers can read their own bookings
DROP POLICY IF EXISTS "Benutzer kann eigene Buchungen lesen" ON buchungen;
CREATE POLICY "customer_buchungen_select" ON buchungen
  FOR SELECT USING (
    (benutzer_id IS NOT NULL AND auth.uid() = benutzer_id)
  );

-- ── buchung_dienstleistungen ──────────────────────────────────────
-- Public INSERT (booking creation inserts service links)
DROP POLICY IF EXISTS "bd_insert" ON buchung_dienstleistungen;
CREATE POLICY "public_buchung_dl_insert" ON buchung_dienstleistungen
  FOR INSERT WITH CHECK (true);

-- Customers can read service links for their own bookings
DROP POLICY IF EXISTS "bd_select" ON buchung_dienstleistungen;
CREATE POLICY "customer_buchung_dl_select" ON buchung_dienstleistungen
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM buchungen b
      WHERE b.id = buchung_dienstleistungen.buchung_id
        AND b.benutzer_id = auth.uid()
    )
  );

-- ── inhalt_versionen ──────────────────────────────────────────────
-- Only authenticated users can read (admin UI for content history)
DROP POLICY IF EXISTS "Jeder kann Inhalt-Versionen lesen" ON inhalt_versionen;
CREATE POLICY "auth_inhalt_versionen_select" ON inhalt_versionen
  FOR SELECT USING (auth.role() = 'authenticated');


-- ════════════════════════════════════════════════════════════════════
-- LOCKED-DOWN TABLES (no public or customer access — service_role only)
-- ════════════════════════════════════════════════════════════════════

-- zahlungen: payment records — no direct public or customer access
-- (customers receive order confirmation emails; service_role handles webhook)
DROP POLICY IF EXISTS "customer_zahlungen_select" ON zahlungen;
-- No policies = no access for anon/authenticated. service_role bypasses RLS.

-- zahlungsvorgaenge: Stripe events — internal only
DROP POLICY IF EXISTS "customer_zahlungsvorgaenge_select" ON zahlungsvorgaenge;
-- No policies = blocked.

-- admin_audit_logs: internal only
DROP POLICY IF EXISTS "customer_admin_audit_logs_select" ON admin_audit_logs;
-- No policies = blocked.

-- End of migration 012

