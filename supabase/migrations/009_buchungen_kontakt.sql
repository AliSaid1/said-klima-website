-- ============================================
-- 009: Buchungen — Kontaktdaten für Gast-Buchungen + Multi-Service-Verknüpfung
-- Ausführen im Supabase SQL Editor:
-- https://supabase.com/dashboard/project/aqqfwaozvlaeqjpkgrxy/sql/new
-- ============================================

-- 1. Kontakt-Spalten für Gast-Buchungen (wenn kein benutzer_id vorhanden)
ALTER TABLE buchungen ADD COLUMN IF NOT EXISTS kontakt_name TEXT;
ALTER TABLE buchungen ADD COLUMN IF NOT EXISTS kontakt_email TEXT;
ALTER TABLE buchungen ADD COLUMN IF NOT EXISTS kontakt_telefon TEXT;

-- 2. Verknüpfungstabelle: Eine Buchung kann mehrere Dienstleistungen haben
CREATE TABLE IF NOT EXISTS buchung_dienstleistungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buchung_id UUID NOT NULL REFERENCES buchungen(id) ON DELETE CASCADE,
  dienstleistung_id UUID NOT NULL REFERENCES dienstleistungen(id) ON DELETE CASCADE,
  erstellt_am TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(buchung_id, dienstleistung_id)
);

-- 3. RLS aktivieren
ALTER TABLE buchung_dienstleistungen ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'bd_insert' AND tablename = 'buchung_dienstleistungen') THEN
    CREATE POLICY "bd_insert" ON buchung_dienstleistungen FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'bd_select' AND tablename = 'buchung_dienstleistungen') THEN
    CREATE POLICY "bd_select" ON buchung_dienstleistungen FOR SELECT USING (true);
  END IF;
END $$;

-- 5. Indizes
CREATE INDEX IF NOT EXISTS idx_buchung_dl_buchung ON buchung_dienstleistungen(buchung_id);
CREATE INDEX IF NOT EXISTS idx_buchungen_kontakt_email ON buchungen(kontakt_email);
CREATE INDEX IF NOT EXISTS idx_buchungen_benutzer_id ON buchungen(benutzer_id);
