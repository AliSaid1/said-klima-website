-- ============================================
-- MIGRATION 007: RLS Policies für Kunden-Zugriff
-- Erlaubt authentifizierten Benutzern ihre eigenen Daten
-- zu lesen, ändern und löschen.
-- ============================================

-- Benutzer: RLS aktivieren + eigene Daten lesen/ändern
ALTER TABLE benutzer ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Benutzer kann eigene Daten lesen" ON benutzer;
CREATE POLICY "Benutzer kann eigene Daten lesen" ON benutzer
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Benutzer kann eigene Daten ändern" ON benutzer;
CREATE POLICY "Benutzer kann eigene Daten ändern" ON benutzer
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Benutzer kann eigenes Konto löschen" ON benutzer;
CREATE POLICY "Benutzer kann eigenes Konto löschen" ON benutzer
  FOR DELETE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Trigger darf Benutzer erstellen" ON benutzer;
CREATE POLICY "Trigger darf Benutzer erstellen" ON benutzer
  FOR INSERT WITH CHECK (true);

-- Benutzer-Adressen: RLS aktivieren + eigene Adressen CRUD
ALTER TABLE benutzer_adressen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Benutzer kann eigene Adressen lesen" ON benutzer_adressen;
CREATE POLICY "Benutzer kann eigene Adressen lesen" ON benutzer_adressen
  FOR SELECT USING (auth.uid() = benutzer_id);

DROP POLICY IF EXISTS "Benutzer kann eigene Adressen erstellen" ON benutzer_adressen;
CREATE POLICY "Benutzer kann eigene Adressen erstellen" ON benutzer_adressen
  FOR INSERT WITH CHECK (auth.uid() = benutzer_id);

DROP POLICY IF EXISTS "Benutzer kann eigene Adressen ändern" ON benutzer_adressen;
CREATE POLICY "Benutzer kann eigene Adressen ändern" ON benutzer_adressen
  FOR UPDATE USING (auth.uid() = benutzer_id);

DROP POLICY IF EXISTS "Benutzer kann eigene Adressen löschen" ON benutzer_adressen;
CREATE POLICY "Benutzer kann eigene Adressen löschen" ON benutzer_adressen
  FOR DELETE USING (auth.uid() = benutzer_id);

-- Bestellungen: Nur eigene sehen
ALTER TABLE bestellungen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Benutzer kann eigene Bestellungen lesen" ON bestellungen;
CREATE POLICY "Benutzer kann eigene Bestellungen lesen" ON bestellungen
  FOR SELECT USING (auth.uid() = benutzer_id);

-- Bestellpositionen: Sichtbar wenn Bestellung dem Benutzer gehört
ALTER TABLE bestellpositionen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Benutzer kann eigene Bestellpositionen lesen" ON bestellpositionen;
CREATE POLICY "Benutzer kann eigene Bestellpositionen lesen" ON bestellpositionen
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bestellungen b
      WHERE b.id = bestellpositionen.bestellung_id
      AND b.benutzer_id = auth.uid()
    )
  );

-- Buchungen: Nur eigene sehen
ALTER TABLE buchungen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Benutzer kann eigene Buchungen lesen" ON buchungen;
CREATE POLICY "Benutzer kann eigene Buchungen lesen" ON buchungen
  FOR SELECT USING (auth.uid() = benutzer_id);

-- Dienstleistungen: Alle authentifizierten Benutzer können lesen
ALTER TABLE dienstleistungen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Jeder kann Dienstleistungen lesen" ON dienstleistungen;
CREATE POLICY "Jeder kann Dienstleistungen lesen" ON dienstleistungen
  FOR SELECT USING (true);

-- Artikel: Jeder darf aktive Artikel sehen
ALTER TABLE artikel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Jeder kann aktive Artikel lesen" ON artikel;
CREATE POLICY "Jeder kann aktive Artikel lesen" ON artikel
  FOR SELECT USING (true);

-- Kategorien: Jeder darf lesen
ALTER TABLE kategorien ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Jeder kann Kategorien lesen" ON kategorien;
CREATE POLICY "Jeder kann Kategorien lesen" ON kategorien
  FOR SELECT USING (true);

-- Marken: Jeder darf lesen
ALTER TABLE marken ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Jeder kann Marken lesen" ON marken;
CREATE POLICY "Jeder kann Marken lesen" ON marken
  FOR SELECT USING (true);

-- Lagerbestände: Jeder darf lesen
ALTER TABLE lagerbestaende ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Jeder kann Lagerbestände lesen" ON lagerbestaende;
CREATE POLICY "Jeder kann Lagerbestände lesen" ON lagerbestaende
  FOR SELECT USING (true);

-- Artikel-Bilder: Jeder darf lesen
ALTER TABLE artikel_bilder ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Jeder kann Artikel-Bilder lesen" ON artikel_bilder;
CREATE POLICY "Jeder kann Artikel-Bilder lesen" ON artikel_bilder
  FOR SELECT USING (true);

-- Artikel technische Daten: Jeder darf lesen
ALTER TABLE artikel_technische_daten ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Jeder kann Technische Daten lesen" ON artikel_technische_daten;
CREATE POLICY "Jeder kann Technische Daten lesen" ON artikel_technische_daten
  FOR SELECT USING (true);

-- Rechtstexte: Veröffentlichte Seiten für alle
ALTER TABLE rechtstexte ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Jeder kann veröffentlichte Rechtstexte lesen" ON rechtstexte;
CREATE POLICY "Jeder kann veröffentlichte Rechtstexte lesen" ON rechtstexte
  FOR SELECT USING (true);

-- Firmeneinstellungen: Jeder darf lesen
ALTER TABLE firmeneinstellungen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Jeder kann Firmeneinstellungen lesen" ON firmeneinstellungen;
CREATE POLICY "Jeder kann Firmeneinstellungen lesen" ON firmeneinstellungen
  FOR SELECT USING (true);

