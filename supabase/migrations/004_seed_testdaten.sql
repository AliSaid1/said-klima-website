-- ============================================
-- SEED DATA for Testing
-- Run AFTER 001_initial_schema.sql and 003_ergaenzungen.sql
-- Uses the German table names from the actual schema
-- ============================================

-- ============================================
-- 1. MARKEN (Brands)
-- ============================================
INSERT INTO marken (id, name) VALUES
  ('b1000000-0000-0000-0000-000000000001'::uuid, 'Daikin'),
  ('b1000000-0000-0000-0000-000000000002'::uuid, 'Mitsubishi')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. KATEGORIEN (Categories)
-- ============================================
INSERT INTO kategorien (id, name, slug, parent_id) VALUES
  ('c1000000-0000-0000-0000-000000000001'::uuid, 'Wandgerät', 'wandgeraet', NULL),
  ('c1000000-0000-0000-0000-000000000002'::uuid, 'Truhengerät', 'truhengeraet', NULL),
  ('c1000000-0000-0000-0000-000000000003'::uuid, 'Kassettengerät', 'kassettengeraet', NULL),
  ('c1000000-0000-0000-0000-000000000004'::uuid, 'Kompaktgerät', 'kompaktgeraet', NULL),
  ('c1000000-0000-0000-0000-000000000005'::uuid, 'Kanalgerät', 'kanalgeraet', NULL)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 3. ARTIKEL (Products)
-- ============================================
INSERT INTO artikel (id, artikelnummer, titel, beschreibung, marke_id, kategorie_id, preis_brutto, steuersatz, aktiv, slug) VALUES
  ('a1000000-0000-0000-0000-000000000001'::uuid, 'DAI-SEN-001', 'Daikin Sensira', 'Das Daikin Sensira Wandgerät bietet hervorragendes Preis-Leistungs-Verhältnis und zuverlässige Kühlung mit minimalem Energieverbrauch.', 'b1000000-0000-0000-0000-000000000001'::uuid, 'c1000000-0000-0000-0000-000000000001'::uuid, 899.00, 19.00, true, 'daikin-sensira'),
  ('a1000000-0000-0000-0000-000000000002'::uuid, 'DAI-PER-001', 'Daikin Perfera', 'Perfera sorgt für erstklassige Luftqualität und optimalen Komfort dank 3D-Luftstrom und fortschrittlicher Luftreinigung.', 'b1000000-0000-0000-0000-000000000001'::uuid, 'c1000000-0000-0000-0000-000000000001'::uuid, 1199.00, 19.00, true, 'daikin-perfera'),
  ('a1000000-0000-0000-0000-000000000003'::uuid, 'DAI-STY-001', 'Daikin Stylish', 'Kompaktes und funktionales Design, das sich in jedes Interieur einfügt. Höchste Effizienz und intelligenter Komfort.', 'b1000000-0000-0000-0000-000000000001'::uuid, 'c1000000-0000-0000-0000-000000000001'::uuid, 1499.00, 19.00, true, 'daikin-stylish'),
  ('a1000000-0000-0000-0000-000000000004'::uuid, 'DAI-EMU-001', 'Daikin Emura', 'Das ultimative Klimagerät in Sachen Design und Technologie. Emura vereint Ästhetik mit herausragender Leistung.', 'b1000000-0000-0000-0000-000000000001'::uuid, 'c1000000-0000-0000-0000-000000000001'::uuid, 1799.00, 19.00, true, 'daikin-emura'),
  ('a1000000-0000-0000-0000-000000000005'::uuid, 'MIT-PRE-001', 'Mitsubishi Heavy Premium', 'Premium-Wandgerät mit höchster Energieeffizienz und fortschrittlichem Allergen-Filter.', 'b1000000-0000-0000-0000-000000000002'::uuid, 'c1000000-0000-0000-0000-000000000001'::uuid, 1299.00, 19.00, true, 'mitsubishi-heavy-premium'),
  ('a1000000-0000-0000-0000-000000000006'::uuid, 'DAI-TRU-001', 'Daikin Truhengerät', 'Ideal für die Installation unter Fenstern. Sorgt für eine optimale Wärmeverteilung im Raum.', 'b1000000-0000-0000-0000-000000000001'::uuid, 'c1000000-0000-0000-0000-000000000002'::uuid, 1299.00, 19.00, true, 'daikin-truhengeraet'),
  ('a1000000-0000-0000-0000-000000000007'::uuid, 'DAI-DEC-001', 'Daikin Deckenkassette', 'Perfekt für abgehängte Decken in gewerblichen Räumen. Bietet eine gleichmäßige Luftverteilung ohne Zugluft.', 'b1000000-0000-0000-0000-000000000001'::uuid, 'c1000000-0000-0000-0000-000000000003'::uuid, 1899.00, 19.00, true, 'daikin-deckenkassette'),
  ('a1000000-0000-0000-0000-000000000008'::uuid, 'MIT-COM-001', 'Mitsubishi Compact', 'Kompaktes Einstiegsmodell für kleinere Räume mit solider Leistung.', 'b1000000-0000-0000-0000-000000000002'::uuid, 'c1000000-0000-0000-0000-000000000004'::uuid, 799.00, 19.00, true, 'mitsubishi-compact')
ON CONFLICT (artikelnummer) DO NOTHING;

-- ============================================
-- 4. LAGERBESTAENDE (Stock)
-- ============================================
INSERT INTO lagerbestaende (artikel_id, bestand, mindestbestand) VALUES
  ('a1000000-0000-0000-0000-000000000001'::uuid, 10, 2),
  ('a1000000-0000-0000-0000-000000000002'::uuid, 8, 2),
  ('a1000000-0000-0000-0000-000000000003'::uuid, 5, 2),
  ('a1000000-0000-0000-0000-000000000004'::uuid, 6, 2),
  ('a1000000-0000-0000-0000-000000000005'::uuid, 7, 2),
  ('a1000000-0000-0000-0000-000000000006'::uuid, 4, 2),
  ('a1000000-0000-0000-0000-000000000007'::uuid, 3, 2),
  ('a1000000-0000-0000-0000-000000000008'::uuid, 12, 2)
ON CONFLICT (artikel_id) DO NOTHING;

-- ============================================
-- 5. ARTIKEL_TECHNISCHE_DATEN (Technical Specs)
-- ============================================
-- The real schema stores each spec as a single free-text `inhalt` line.
INSERT INTO artikel_technische_daten (id, artikel_id, inhalt, anzeige_reihenfolge) VALUES
  -- Sensira
  ('a2000000-0000-0000-0000-000000000101'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'Energieeffizienz: A++', 1),
  ('a2000000-0000-0000-0000-000000000102'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'Raumgröße: bis 30m²', 2),
  ('a2000000-0000-0000-0000-000000000103'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'Lautstärke: 21 dB(A)', 3),
  ('a2000000-0000-0000-0000-000000000104'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'Kühlleistung: 2.5 kW', 4),
  ('a2000000-0000-0000-0000-000000000105'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'Heizleistung: 2.8 kW', 5),
  ('a2000000-0000-0000-0000-000000000106'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'Abmessungen: 286 x 770 x 225 mm', 6),
  ('a2000000-0000-0000-0000-000000000107'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'Gewicht: 9 kg', 7),
  ('a2000000-0000-0000-0000-000000000108'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'Kältemittel: R-32', 8),
  -- Perfera
  ('a2000000-0000-0000-0000-000000000201'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'Energieeffizienz: A+++', 1),
  ('a2000000-0000-0000-0000-000000000202'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'Raumgröße: bis 40m²', 2),
  ('a2000000-0000-0000-0000-000000000203'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'Lautstärke: 19 dB(A)', 3),
  ('a2000000-0000-0000-0000-000000000204'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'Kühlleistung: 3.5 kW', 4),
  ('a2000000-0000-0000-0000-000000000205'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'Heizleistung: 4.0 kW', 5),
  -- Stylish
  ('a2000000-0000-0000-0000-000000000301'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'Energieeffizienz: A+++', 1),
  ('a2000000-0000-0000-0000-000000000302'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'Raumgröße: bis 50m²', 2),
  ('a2000000-0000-0000-0000-000000000303'::uuid, 'a1000000-0000-0000-0000-000000000003'::uuid, 'Lautstärke: 19 dB(A)', 3),
  -- Emura
  ('a2000000-0000-0000-0000-000000000401'::uuid, 'a1000000-0000-0000-0000-000000000004'::uuid, 'Energieeffizienz: A+++', 1),
  ('a2000000-0000-0000-0000-000000000402'::uuid, 'a1000000-0000-0000-0000-000000000004'::uuid, 'Raumgröße: bis 60m²', 2)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. DIENSTLEISTUNGEN (Services)
-- ============================================
INSERT INTO dienstleistungen (id, code, name, beschreibung, basispreis_brutto, steuersatz, dauer_minuten, aktiv) VALUES
  ('d1000000-0000-0000-0000-000000000001'::uuid, 'INSTALLATION', 'Installation', 'Fachgerechte Montage und Inbetriebnahme Ihrer Klimaanlage', 499.00, 19.00, 180, true),
  ('d1000000-0000-0000-0000-000000000002'::uuid, 'WARTUNG', 'Wartung', 'Saisonale Wartung und Filterreinigung', 149.00, 19.00, 90, true),
  ('d1000000-0000-0000-0000-000000000003'::uuid, 'REPARATUR', 'Reparatur', 'Diagnose und Reparatur von Störungen', 199.00, 19.00, 120, true),
  ('d1000000-0000-0000-0000-000000000004'::uuid, 'BERATUNG', 'Beratung vor Ort', 'Persönliche Beratung und Aufmaß vor Ort', 0.00, 19.00, 60, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 7. TECHNIKER (Technicians)
-- ============================================
INSERT INTO techniker (id, vorname, nachname, telefon, email, aktiv) VALUES
  ('00000000-aaaa-0000-0000-000000000001'::uuid, 'Ali', 'Said', '+49 170 1234567', 'ali.said@said-klima.de', true),
  ('00000000-aaaa-0000-0000-000000000002'::uuid, 'Max', 'Müller', '+49 170 7654321', 'max.mueller@said-klima.de', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. TECHNIKER_VERFUEGBARKEIT (Availability — Mo-Fr 08:00-17:00)
-- ============================================
INSERT INTO techniker_verfuegbarkeit (techniker_id, wochentag, start_zeit, ende_zeit, verfuegbar) VALUES
  -- Ali Said: Mo-Fr
  ('00000000-aaaa-0000-0000-000000000001'::uuid, 1, '08:00', '17:00', true),
  ('00000000-aaaa-0000-0000-000000000001'::uuid, 2, '08:00', '17:00', true),
  ('00000000-aaaa-0000-0000-000000000001'::uuid, 3, '08:00', '17:00', true),
  ('00000000-aaaa-0000-0000-000000000001'::uuid, 4, '08:00', '17:00', true),
  ('00000000-aaaa-0000-0000-000000000001'::uuid, 5, '08:00', '17:00', true),
  -- Max Müller: Mo-Fr
  ('00000000-aaaa-0000-0000-000000000002'::uuid, 1, '08:00', '17:00', true),
  ('00000000-aaaa-0000-0000-000000000002'::uuid, 2, '08:00', '17:00', true),
  ('00000000-aaaa-0000-0000-000000000002'::uuid, 3, '08:00', '17:00', true),
  ('00000000-aaaa-0000-0000-000000000002'::uuid, 4, '08:00', '17:00', true),
  ('00000000-aaaa-0000-0000-000000000002'::uuid, 5, '08:00', '17:00', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. FIRMENEINSTELLUNGEN (Company Settings — singleton)
-- ============================================
INSERT INTO firmeneinstellungen (id, firmenname, email, telefon, ust_id, adresse_json)
VALUES (
  'f0000000-0000-0000-0000-000000000001'::uuid,
  'Said Kälte- und Klimatechnik',
  'info@said-klima.de',
  '0800 123 4567',
  'DE123456789',
  '{"strasse": "Musterstraße 123", "plz": "10115", "ort": "Berlin", "land": "Deutschland"}'::jsonb
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 10. RECHTSTEXTE (Content Pages for CMS)
-- ============================================
INSERT INTO rechtstexte (id, slug, titel, content_html, version, "veröffentlicht") VALUES
  ('e0000001-0000-0000-0000-000000000001'::uuid, 'agb', 'Allgemeine Geschäftsbedingungen', '<h1>Allgemeine Geschäftsbedingungen</h1><p>Hier stehen die AGB der Firma Said Kälte- und Klimatechnik.</p>', '1.0', true),
  ('e0000002-0000-0000-0000-000000000002'::uuid, 'impressum', 'Impressum', '<h1>Impressum</h1><p>Said Kälte- und Klimatechnik<br/>Musterstraße 123<br/>10115 Berlin</p>', '1.0', true),
  ('e0000003-0000-0000-0000-000000000003'::uuid, 'datenschutz', 'Datenschutzerklärung', '<h1>Datenschutzerklärung</h1><p>Hier steht die Datenschutzerklärung.</p>', '1.0', true),
  ('e0000004-0000-0000-0000-000000000004'::uuid, 'widerruf', 'Widerrufsbelehrung', '<h1>Widerrufsbelehrung</h1><p>Hier steht die Widerrufsbelehrung.</p>', '1.0', true),
  ('e0000005-0000-0000-0000-000000000005'::uuid, 'versand-zahlung', 'Versand & Zahlung', '<h1>Versand & Zahlung</h1><p>Informationen zu Versand und Zahlungsmethoden.</p>', '1.0', true),
  ('e0000006-0000-0000-0000-000000000006'::uuid, 'ueber-uns', 'Über uns', '<h1>Über uns</h1><p>Said Kälte- und Klimatechnik steht für höchste Qualität, Zuverlässigkeit und exzellenten Kundenservice.</p>', '1.0', true),
  ('e0000007-0000-0000-0000-000000000007'::uuid, 'startseite', 'Startseite', '<h1>Willkommen</h1><p>Willkommen bei Said Kälte- und Klimatechnik.</p>', '1.0', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Done! Test data is ready.
-- ============================================

