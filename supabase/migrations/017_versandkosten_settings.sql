-- Migration 017: Add dynamic shipping cost settings to firmeneinstellungen
-- These values are used by the cart, checkout API, and admin settings page.

ALTER TABLE firmeneinstellungen
  ADD COLUMN IF NOT EXISTS versandkosten         NUMERIC(10,2) DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS versandkostenlos_ab   NUMERIC(10,2) DEFAULT 500.00;

-- Back-fill existing rows so they have values
UPDATE firmeneinstellungen
SET
  versandkosten       = COALESCE(versandkosten,       5.00),
  versandkostenlos_ab = COALESCE(versandkostenlos_ab, 500.00)
WHERE versandkosten IS NULL OR versandkostenlos_ab IS NULL;

