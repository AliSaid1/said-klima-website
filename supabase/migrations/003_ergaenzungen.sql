-- ============================================
-- MIGRATION 003: Ergänzungen zum bestehenden Schema
-- Dieses Skript fügt fehlende Spalten und Tabellen hinzu,
-- die für das Admin-Dashboard benötigt werden.
-- ============================================

-- ============================================
-- 1. FIRMENEINSTELLUNGEN — Fehlende Spalten
-- ============================================
ALTER TABLE firmeneinstellungen
  ADD COLUMN IF NOT EXISTS oeffnungszeiten JSONB DEFAULT '[
    {"tag": "Montag",     "von": "08:00", "bis": "18:00", "geoeffnet": true},
    {"tag": "Dienstag",   "von": "08:00", "bis": "18:00", "geoeffnet": true},
    {"tag": "Mittwoch",   "von": "08:00", "bis": "18:00", "geoeffnet": true},
    {"tag": "Donnerstag", "von": "08:00", "bis": "18:00", "geoeffnet": true},
    {"tag": "Freitag",    "von": "08:00", "bis": "18:00", "geoeffnet": true},
    {"tag": "Samstag",    "von": "09:00", "bis": "14:00", "geoeffnet": true},
    {"tag": "Sonntag",    "von": "",      "bis": "",      "geoeffnet": false}
  ]'::jsonb,
  ADD COLUMN IF NOT EXISTS primaerfarbe TEXT DEFAULT '#2563EB',
  ADD COLUMN IF NOT EXISTS sekundaerfarbe TEXT DEFAULT '#0F172A',
  ADD COLUMN IF NOT EXISTS akzentfarbe TEXT DEFAULT '#3B82F6',
  ADD COLUMN IF NOT EXISTS support_email TEXT,
  ADD COLUMN IF NOT EXISTS support_telefon TEXT;

-- Singleton-Schutz: Nur eine Zeile erlaubt
CREATE UNIQUE INDEX IF NOT EXISTS single_firmeneinstellungen ON firmeneinstellungen ((true));

-- ============================================
-- 2. ARTIKEL — Fehlende Spalten (SEO, Rabatt, Slug)
-- ============================================
ALTER TABLE artikel
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS rabattpreis NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS meta_titel TEXT,
  ADD COLUMN IF NOT EXISTS meta_beschreibung TEXT,
  ADD COLUMN IF NOT EXISTS meta_tags TEXT[];

-- Slug aus Titel generieren für bestehende Artikel (einmalig)
UPDATE artikel SET slug = LOWER(REPLACE(REPLACE(titel, ' ', '-'), 'ä', 'ae')) WHERE slug IS NULL;

-- Danach NOT NULL setzen
-- ALTER TABLE artikel ALTER COLUMN slug SET NOT NULL;

-- ============================================
-- 3. EMAIL-VORLAGEN (Editierbare E-Mail Templates)
-- ============================================
CREATE TABLE IF NOT EXISTS email_vorlagen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  typ TEXT NOT NULL UNIQUE,  -- z.B. 'buchung_bestaetigung', 'buchung_erinnerung', etc.
  betreff TEXT NOT NULL,
  inhalt_html TEXT NOT NULL,
  variablen TEXT[],  -- Liste der verfügbaren Platzhalter, z.B. {'{{kundenname}}', '{{datum}}'}
  aktualisiert_am TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Standard-Vorlagen einfügen
INSERT INTO email_vorlagen (typ, betreff, inhalt_html, variablen) VALUES
  ('buchung_bestaetigung', 'Terminbestätigung — {{dienstleistung}}', '<h1>Ihr Termin wurde bestätigt</h1><p>Hallo {{kundenname}},</p><p>Ihr Termin für <strong>{{dienstleistung}}</strong> am <strong>{{datum}}</strong> um <strong>{{uhrzeit}}</strong> wurde erfolgreich gebucht.</p><p>Bei Fragen erreichen Sie uns unter {{firmen_telefon}} oder {{firmen_email}}.</p><p>Mit freundlichen Grüßen,<br/>{{firmenname}}</p>', ARRAY['{{kundenname}}', '{{dienstleistung}}', '{{datum}}', '{{uhrzeit}}', '{{firmenname}}', '{{firmen_telefon}}', '{{firmen_email}}']),
  ('buchung_erinnerung', 'Erinnerung: Ihr Termin morgen — {{dienstleistung}}', '<h1>Terminerinnerung</h1><p>Hallo {{kundenname}},</p><p>Wir möchten Sie daran erinnern, dass Sie morgen (<strong>{{datum}}</strong>) um <strong>{{uhrzeit}}</strong> einen Termin für <strong>{{dienstleistung}}</strong> bei uns haben.</p><p>Falls Sie den Termin absagen möchten, kontaktieren Sie uns bitte unter {{firmen_telefon}}.</p><p>Mit freundlichen Grüßen,<br/>{{firmenname}}</p>', ARRAY['{{kundenname}}', '{{dienstleistung}}', '{{datum}}', '{{uhrzeit}}', '{{firmenname}}', '{{firmen_telefon}}']),
  ('buchung_absage', 'Stornierung: Ihr Termin — {{dienstleistung}}', '<h1>Termin storniert</h1><p>Hallo {{kundenname}},</p><p>Ihr Termin für <strong>{{dienstleistung}}</strong> am <strong>{{datum}}</strong> um <strong>{{uhrzeit}}</strong> wurde storniert.</p><p>Falls Sie einen neuen Termin vereinbaren möchten, besuchen Sie bitte unsere Website oder rufen Sie uns an unter {{firmen_telefon}}.</p><p>Mit freundlichen Grüßen,<br/>{{firmenname}}</p>', ARRAY['{{kundenname}}', '{{dienstleistung}}', '{{datum}}', '{{uhrzeit}}', '{{firmenname}}', '{{firmen_telefon}}']),
  ('bestellung_bestaetigung', 'Bestellbestätigung — Bestellung #{{bestellnummer}}', '<h1>Vielen Dank für Ihre Bestellung!</h1><p>Hallo {{kundenname}},</p><p>Wir haben Ihre Bestellung <strong>#{{bestellnummer}}</strong> erhalten und bearbeiten diese nun.</p><p><strong>Gesamtbetrag:</strong> {{gesamt}} €</p><p>Sie erhalten eine weitere E-Mail, sobald Ihre Bestellung versendet wird.</p><p>Mit freundlichen Grüßen,<br/>{{firmenname}}</p>', ARRAY['{{kundenname}}', '{{bestellnummer}}', '{{gesamt}}', '{{firmenname}}']),
  ('bestellung_status', 'Update zu Ihrer Bestellung #{{bestellnummer}}', '<h1>Status-Update</h1><p>Hallo {{kundenname}},</p><p>Der Status Ihrer Bestellung <strong>#{{bestellnummer}}</strong> wurde auf <strong>{{status}}</strong> aktualisiert.</p><p>Bei Fragen erreichen Sie uns unter {{firmen_telefon}} oder {{firmen_email}}.</p><p>Mit freundlichen Grüßen,<br/>{{firmenname}}</p>', ARRAY['{{kundenname}}', '{{bestellnummer}}', '{{status}}', '{{firmenname}}', '{{firmen_telefon}}', '{{firmen_email}}'])
ON CONFLICT (typ) DO NOTHING;

-- ============================================
-- 4. INHALT-VERSIONEN (CMS Versionierung)
-- ============================================
-- rechtstexte wird als CMS genutzt, braucht Versionierung
CREATE TABLE IF NOT EXISTS inhalt_versionen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rechtstext_id UUID NOT NULL REFERENCES rechtstexte(id) ON DELETE CASCADE,
  content_html TEXT NOT NULL,
  version_nummer INTEGER NOT NULL,
  erstellt_am TIMESTAMPTZ NOT NULL DEFAULT now(),
  erstellt_von UUID REFERENCES benutzer(id) ON DELETE SET NULL,
  UNIQUE(rechtstext_id, version_nummer)
);

CREATE INDEX IF NOT EXISTS idx_inhalt_versionen_rechtstext ON inhalt_versionen(rechtstext_id);

-- ============================================
-- 5. GESPERRTE TAGE (Kalender-Blockierungen)
-- ============================================
CREATE TABLE IF NOT EXISTS gesperrte_tage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datum DATE NOT NULL,
  grund TEXT,
  techniker_id UUID REFERENCES techniker(id) ON DELETE CASCADE,  -- NULL = global blockiert
  erstellt_am TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(datum, techniker_id)
);

-- ============================================
-- 6. BUCHUNGEN — Erinnerung-Flag
-- ============================================
ALTER TABLE buchungen
  ADD COLUMN IF NOT EXISTS erinnerung_gesendet BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- 7. BESTELLUNGEN — Interne Notizen
-- ============================================
ALTER TABLE bestellungen
  ADD COLUMN IF NOT EXISTS notizen JSONB DEFAULT '[]'::jsonb;  -- Array von {text, erstellt_am, autor}

-- ============================================
-- 8. ADMIN_AUDIT_LOGS — Bugfix: unique constraint entfernen
-- ============================================
ALTER TABLE admin_audit_logs
  DROP CONSTRAINT IF EXISTS unique_entitaet_typ;

-- Index statt unique constraint für Performance
CREATE INDEX IF NOT EXISTS idx_audit_entitaet_typ ON admin_audit_logs(entitaet_typ);
CREATE INDEX IF NOT EXISTS idx_audit_erstellt ON admin_audit_logs(erstellt_am DESC);

-- ============================================
-- 9. ROW LEVEL SECURITY
-- ============================================

-- Aktiviere RLS auf neuen Tabellen
ALTER TABLE email_vorlagen ENABLE ROW LEVEL SECURITY;
ALTER TABLE inhalt_versionen ENABLE ROW LEVEL SECURITY;
ALTER TABLE gesperrte_tage ENABLE ROW LEVEL SECURITY;

-- Öffentliche Leserechte
CREATE POLICY "Oeffentlich: Rechtstexte lesen" ON rechtstexte
  FOR SELECT USING ("veröffentlicht" = true);

CREATE POLICY "Oeffentlich: Firmeneinstellungen lesen" ON firmeneinstellungen
  FOR SELECT USING (true);

CREATE POLICY "Oeffentlich: Aktive Artikel lesen" ON artikel
  FOR SELECT USING (aktiv = true);

CREATE POLICY "Oeffentlich: Kategorien lesen" ON kategorien
  FOR SELECT USING (true);

CREATE POLICY "Oeffentlich: Marken lesen" ON marken
  FOR SELECT USING (true);

CREATE POLICY "Oeffentlich: Artikelbilder lesen" ON artikel_bilder
  FOR SELECT USING (true);

CREATE POLICY "Oeffentlich: Technische Daten lesen" ON artikel_technische_daten
  FOR SELECT USING (true);

CREATE POLICY "Oeffentlich: Lagerbestaende lesen" ON lagerbestaende
  FOR SELECT USING (true);

CREATE POLICY "Oeffentlich: Gesperrte Tage lesen" ON gesperrte_tage
  FOR SELECT USING (true);

CREATE POLICY "Oeffentlich: Techniker Verfuegbarkeit lesen" ON techniker_verfuegbarkeit
  FOR SELECT USING (verfuegbar = true);

-- Öffentliche Buchungen erstellen
CREATE POLICY "Oeffentlich: Buchung erstellen" ON buchungen
  FOR INSERT WITH CHECK (true);

-- Admin-Vollzugriff (authentifizierte Benutzer)
-- Hinweis: In Phase 7 wird dies auf Rollen-Check umgestellt
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'email_vorlagen', 'inhalt_versionen', 'gesperrte_tage',
    'benutzer', 'benutzer_adressen', 'artikel', 'kategorien', 'marken',
    'lagerbestaende', 'artikel_technische_daten', 'artikel_bilder',
    'dienstleistungen', 'techniker', 'techniker_verfuegbarkeit',
    'buchungen', 'bestellungen', 'bestellpositionen',
    'zahlungen', 'zahlungsvorgaenge', 'admin_audit_logs',
    'firmeneinstellungen', 'rechtstexte', 'email_vorlagen', 'medien_dateien'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "Admin Vollzugriff auf %I" ON %I FOR ALL USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'')', tbl, tbl);
  END LOOP;
EXCEPTION WHEN duplicate_object THEN
  NULL;  -- Policies existieren bereits
END$$;

-- ============================================
-- 10. AUTO-UPDATE TRIGGER für neue Tabellen
-- ============================================
CREATE OR REPLACE FUNCTION update_aktualisiert_am()
RETURNS TRIGGER AS $$
BEGIN
  NEW.aktualisiert_am = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_aktualisiert_email_vorlagen
  BEFORE UPDATE ON email_vorlagen FOR EACH ROW EXECUTE FUNCTION update_aktualisiert_am();

