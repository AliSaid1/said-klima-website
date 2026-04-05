-- ============================================
-- MIGRATION 011: Bekannte Lücken — Fehlende Spalten
-- Verified against live DB on 2026-03-29.
-- All column names derived from actual application code (checkout, webhook, admin).
-- Safe to run multiple times (IF NOT EXISTS everywhere).
-- ============================================

-- ─── 1. artikel_bilder — add erstellt_am ────────────────────────────────────
ALTER TABLE artikel_bilder
  ADD COLUMN IF NOT EXISTS erstellt_am TIMESTAMPTZ DEFAULT now();

-- ─── 2. marken — add erstellt_am ────────────────────────────────────────────
ALTER TABLE marken
  ADD COLUMN IF NOT EXISTS erstellt_am TIMESTAMPTZ DEFAULT now();

-- ─── 3. lagerbestaende — add timestamps ─────────────────────────────────────
ALTER TABLE lagerbestaende
  ADD COLUMN IF NOT EXISTS erstellt_am    TIMESTAMPTZ DEFAULT now();
ALTER TABLE lagerbestaende
  ADD COLUMN IF NOT EXISTS aktualisiert_am TIMESTAMPTZ DEFAULT now();

-- ─── 4. kategorien — add all missing columns ────────────────────────────────
ALTER TABLE kategorien
  ADD COLUMN IF NOT EXISTS beschreibung       TEXT,
  ADD COLUMN IF NOT EXISTS bild_url           TEXT,
  ADD COLUMN IF NOT EXISTS anzeige_reihenfolge INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aktiv              BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS erstellt_am        TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS aktualisiert_am    TIMESTAMPTZ DEFAULT now();

-- ─── 5. dienstleistungen — add timestamps ───────────────────────────────────
ALTER TABLE dienstleistungen
  ADD COLUMN IF NOT EXISTS erstellt_am    TIMESTAMPTZ DEFAULT now();
ALTER TABLE dienstleistungen
  ADD COLUMN IF NOT EXISTS aktualisiert_am TIMESTAMPTZ DEFAULT now();

-- ─── 6. techniker — add timestamps ──────────────────────────────────────────
ALTER TABLE techniker
  ADD COLUMN IF NOT EXISTS erstellt_am    TIMESTAMPTZ DEFAULT now();
ALTER TABLE techniker
  ADD COLUMN IF NOT EXISTS aktualisiert_am TIMESTAMPTZ DEFAULT now();

-- ─── 7. bestellungen — add pricing + Stripe columns ─────────────────────────
-- Column names match the actual checkout API (app/api/checkout/route.ts)
ALTER TABLE bestellungen
  ADD COLUMN IF NOT EXISTS gast_email                TEXT,
  ADD COLUMN IF NOT EXISTS zwischensumme_brutto      NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS steuer_summe              NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS versand_brutto            NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gesamt_brutto             NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zahlungsmethode           TEXT,
  ADD COLUMN IF NOT EXISTS stripe_session_id         TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id  TEXT,
  ADD COLUMN IF NOT EXISTS bestellt_am               TIMESTAMPTZ;  -- set by Stripe webhook on payment

-- ─── 8. bestellpositionen — add line-item detail columns ────────────────────
-- Column names match the actual checkout API
ALTER TABLE bestellpositionen
  ADD COLUMN IF NOT EXISTS variante_name     TEXT,           -- selected variant label (from artikel.varianten JSONB)
  ADD COLUMN IF NOT EXISTS typ              TEXT DEFAULT 'artikel',  -- 'artikel' | 'dienstleistung'
  ADD COLUMN IF NOT EXISTS titel            TEXT,            -- snapshot of artikel.titel at time of order
  ADD COLUMN IF NOT EXISTS preis_brutto     NUMERIC(10,2) DEFAULT 0,  -- unit price (incl. VAT)
  ADD COLUMN IF NOT EXISTS einzelpreis_netto NUMERIC(10,2) DEFAULT 0, -- unit price (excl. VAT)
  ADD COLUMN IF NOT EXISTS erstellt_am      TIMESTAMPTZ DEFAULT now();

-- ─── 9. zahlungen — add payment columns ─────────────────────────────────────
-- Column names match the Stripe webhook handler (app/api/webhooks/stripe/route.ts)
ALTER TABLE zahlungen
  ADD COLUMN IF NOT EXISTS anbieter      TEXT DEFAULT 'stripe',  -- payment provider
  ADD COLUMN IF NOT EXISTS betrag_brutto NUMERIC(10,2) DEFAULT 0; -- total amount incl. VAT

-- ─── 10. zahlungsvorgaenge — add event detail columns ───────────────────────
-- Column names match the Stripe webhook handler
ALTER TABLE zahlungsvorgaenge
  ADD COLUMN IF NOT EXISTS ereignis      TEXT,          -- Stripe event type, e.g. 'checkout.session.completed'
  ADD COLUMN IF NOT EXISTS betrag_brutto NUMERIC(10,2), -- amount from the event
  ADD COLUMN IF NOT EXISTS rohdaten      JSONB;         -- full raw Stripe event payload

-- ─── 11. admin_audit_logs — add actor + detail columns ──────────────────────
ALTER TABLE admin_audit_logs
  ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES benutzer(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS details  JSONB;

-- ─── 12. medien_dateien — add file origin columns ───────────────────────────
ALTER TABLE medien_dateien
  ADD COLUMN IF NOT EXISTS dateiname       TEXT,
  ADD COLUMN IF NOT EXISTS bucket          TEXT DEFAULT 'product-images',
  ADD COLUMN IF NOT EXISTS hochgeladen_von UUID REFERENCES benutzer(id) ON DELETE SET NULL;

-- ─── 13. Auto-update triggers for new aktualisiert_am columns ───────────────
-- The function update_aktualisiert_am() was created in migration 003.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_aktualisiert_lagerbestaende') THEN
    CREATE TRIGGER set_aktualisiert_lagerbestaende
      BEFORE UPDATE ON lagerbestaende
      FOR EACH ROW EXECUTE FUNCTION update_aktualisiert_am();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_aktualisiert_kategorien') THEN
    CREATE TRIGGER set_aktualisiert_kategorien
      BEFORE UPDATE ON kategorien
      FOR EACH ROW EXECUTE FUNCTION update_aktualisiert_am();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_aktualisiert_dienstleistungen') THEN
    CREATE TRIGGER set_aktualisiert_dienstleistungen
      BEFORE UPDATE ON dienstleistungen
      FOR EACH ROW EXECUTE FUNCTION update_aktualisiert_am();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_aktualisiert_techniker') THEN
    CREATE TRIGGER set_aktualisiert_techniker
      BEFORE UPDATE ON techniker
      FOR EACH ROW EXECUTE FUNCTION update_aktualisiert_am();
  END IF;
END$$;

-- End of migration 011

