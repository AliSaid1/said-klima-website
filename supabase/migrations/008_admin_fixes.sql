-- ============================================
-- MIGRATION 008: Admin Dashboard Fixes
-- 1. Missing columns for firmeneinstellungen
-- 2. Seed email_vorlagen with default templates
-- 3. RLS policies for admin write access on all tables
-- 4. RLS for techniker table (read by all)
-- ============================================

-- ─── 1. Missing columns for firmeneinstellungen ──────────
ALTER TABLE firmeneinstellungen
  ADD COLUMN IF NOT EXISTS oeffnungszeiten JSONB,
  ADD COLUMN IF NOT EXISTS primaerfarbe TEXT DEFAULT '#2563EB',
  ADD COLUMN IF NOT EXISTS sekundaerfarbe TEXT DEFAULT '#0F172A',
  ADD COLUMN IF NOT EXISTS akzentfarbe TEXT DEFAULT '#3B82F6';

-- ─── 2. Seed email_vorlagen ──────────────────────────────
-- Only insert if no templates exist yet
INSERT INTO email_vorlagen (typ, betreff, inhalt_html, variablen)
SELECT * FROM (VALUES
  ('buchung_bestaetigung',
   'Ihre Buchung wurde bestätigt — {{dienstleistung}}',
   '<h1>Buchung bestätigt</h1>
<p>Hallo {{vorname}},</p>
<p>Ihre Buchung für <strong>{{dienstleistung}}</strong> wurde bestätigt.</p>
<p><strong>Termin:</strong> {{datum}} um {{uhrzeit}}</p>
<p><strong>Adresse:</strong> {{adresse}}</p>
<p>Bei Fragen erreichen Sie uns unter {{firma_telefon}}.</p>
<p>Mit freundlichen Grüßen,<br/>{{firma_name}}</p>',
   ARRAY['{{vorname}}','{{dienstleistung}}','{{datum}}','{{uhrzeit}}','{{adresse}}','{{firma_telefon}}','{{firma_name}}']),

  ('buchung_erinnerung',
   'Erinnerung: Ihr Termin morgen — {{dienstleistung}}',
   '<h1>Terminerinnerung</h1>
<p>Hallo {{vorname}},</p>
<p>Dies ist eine Erinnerung an Ihren morgigen Termin:</p>
<p><strong>{{dienstleistung}}</strong><br/>{{datum}} um {{uhrzeit}}</p>
<p>Bitte stellen Sie sicher, dass der Zugang zur Anlage frei ist.</p>
<p>Mit freundlichen Grüßen,<br/>{{firma_name}}</p>',
   ARRAY['{{vorname}}','{{dienstleistung}}','{{datum}}','{{uhrzeit}}','{{firma_name}}']),

  ('buchung_absage',
   'Ihre Buchung wurde storniert — {{dienstleistung}}',
   '<h1>Buchung storniert</h1>
<p>Hallo {{vorname}},</p>
<p>Ihre Buchung für <strong>{{dienstleistung}}</strong> am {{datum}} wurde storniert.</p>
<p>Falls Sie Fragen haben, kontaktieren Sie uns bitte unter {{firma_telefon}}.</p>
<p>Mit freundlichen Grüßen,<br/>{{firma_name}}</p>',
   ARRAY['{{vorname}}','{{dienstleistung}}','{{datum}}','{{firma_telefon}}','{{firma_name}}']),

  ('bestellung_bestaetigung',
   'Bestellbestätigung #{{bestellnummer}}',
   '<h1>Vielen Dank für Ihre Bestellung!</h1>
<p>Hallo {{vorname}},</p>
<p>Ihre Bestellung <strong>#{{bestellnummer}}</strong> wurde erfolgreich aufgegeben.</p>
<p><strong>Gesamtbetrag:</strong> {{gesamt}} €</p>
<p>Sie erhalten eine weitere E-Mail, sobald Ihre Bestellung versendet wird.</p>
<p>Mit freundlichen Grüßen,<br/>{{firma_name}}</p>',
   ARRAY['{{vorname}}','{{bestellnummer}}','{{gesamt}}','{{firma_name}}']),

  ('bestellung_status',
   'Status-Update zu Ihrer Bestellung #{{bestellnummer}}',
   '<h1>Status-Update</h1>
<p>Hallo {{vorname}},</p>
<p>Der Status Ihrer Bestellung <strong>#{{bestellnummer}}</strong> wurde aktualisiert:</p>
<p><strong>Neuer Status:</strong> {{status}}</p>
<p>Bei Fragen erreichen Sie uns unter {{firma_telefon}}.</p>
<p>Mit freundlichen Grüßen,<br/>{{firma_name}}</p>',
   ARRAY['{{vorname}}','{{bestellnummer}}','{{status}}','{{firma_telefon}}','{{firma_name}}'])
) AS t(typ, betreff, inhalt_html, variablen)
WHERE NOT EXISTS (SELECT 1 FROM email_vorlagen LIMIT 1);

-- ─── 3. RLS policies for admin write access ─────────────
-- Enable RLS on tables that might not have it yet
ALTER TABLE techniker ENABLE ROW LEVEL SECURITY;
ALTER TABLE gesperrte_tage ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_vorlagen ENABLE ROW LEVEL SECURITY;
ALTER TABLE techniker_verfuegbarkeit ENABLE ROW LEVEL SECURITY;
ALTER TABLE medien_dateien ENABLE ROW LEVEL SECURITY;

-- Techniker: public read
DROP POLICY IF EXISTS "Jeder kann Techniker lesen" ON techniker;
CREATE POLICY "Jeder kann Techniker lesen" ON techniker
  FOR SELECT USING (true);

-- Techniker verfuegbarkeit: public read
DROP POLICY IF EXISTS "Jeder kann Verfuegbarkeit lesen" ON techniker_verfuegbarkeit;
CREATE POLICY "Jeder kann Verfuegbarkeit lesen" ON techniker_verfuegbarkeit
  FOR SELECT USING (true);

-- Gesperrte Tage: public read (already exists from 003 but idempotent)
DROP POLICY IF EXISTS "Jeder kann gesperrte Tage lesen" ON gesperrte_tage;
CREATE POLICY "Jeder kann gesperrte Tage lesen" ON gesperrte_tage
  FOR SELECT USING (true);

-- Email Vorlagen: read for authenticated
DROP POLICY IF EXISTS "Auth kann Email Vorlagen lesen" ON email_vorlagen;
CREATE POLICY "Auth kann Email Vorlagen lesen" ON email_vorlagen
  FOR SELECT USING (auth.role() = 'authenticated');

-- Medien: read for all
DROP POLICY IF EXISTS "Jeder kann Medien lesen" ON medien_dateien;
CREATE POLICY "Jeder kann Medien lesen" ON medien_dateien
  FOR SELECT USING (true);

-- ─── Admin write policies (authenticated users can write) ──
-- These use DROP IF EXISTS to be idempotent with 003

DO $$
DECLARE
  tbl TEXT;
  pol_name TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'techniker', 'techniker_verfuegbarkeit', 'gesperrte_tage',
    'email_vorlagen', 'firmeneinstellungen', 'rechtstexte',
    'inhalt_versionen', 'medien_dateien', 'dienstleistungen',
    'artikel', 'kategorien', 'marken', 'lagerbestaende',
    'artikel_technische_daten', 'artikel_bilder',
    'bestellungen', 'bestellpositionen',
    'buchungen', 'zahlungen', 'zahlungsvorgaenge',
    'admin_audit_logs'
  ])
  LOOP
    -- INSERT
    pol_name := 'Auth kann ' || tbl || ' erstellen';
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_name, tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (auth.role() = ''authenticated'')', pol_name, tbl);

    -- UPDATE
    pol_name := 'Auth kann ' || tbl || ' aendern';
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_name, tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (auth.role() = ''authenticated'')', pol_name, tbl);

    -- DELETE
    pol_name := 'Auth kann ' || tbl || ' loeschen';
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_name, tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (auth.role() = ''authenticated'')', pol_name, tbl);
  END LOOP;
END$$;

-- ─── 4. Ensure firmeneinstellungen has at least one row ──
INSERT INTO firmeneinstellungen (firmenname, email, telefon, ust_id, adresse_json, oeffnungszeiten, primaerfarbe, sekundaerfarbe, akzentfarbe)
SELECT
  'Said Kälte- & Klimatechnik',
  'info@said-klima.de',
  '+49 123 456789',
  'DE123456789',
  '{"strasse": "Musterstraße 1", "plz": "10115", "ort": "Berlin", "land": "DE"}'::jsonb,
  '[
    {"tag": "Montag", "von": "08:00", "bis": "18:00", "geoeffnet": true},
    {"tag": "Dienstag", "von": "08:00", "bis": "18:00", "geoeffnet": true},
    {"tag": "Mittwoch", "von": "08:00", "bis": "18:00", "geoeffnet": true},
    {"tag": "Donnerstag", "von": "08:00", "bis": "18:00", "geoeffnet": true},
    {"tag": "Freitag", "von": "08:00", "bis": "17:00", "geoeffnet": true},
    {"tag": "Samstag", "von": "09:00", "bis": "14:00", "geoeffnet": true},
    {"tag": "Sonntag", "von": "", "bis": "", "geoeffnet": false}
  ]'::jsonb,
  '#2563EB',
  '#0F172A',
  '#3B82F6'
WHERE NOT EXISTS (SELECT 1 FROM firmeneinstellungen LIMIT 1);

