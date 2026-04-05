-- Migration: Ensure artikelnummer column exists on bestellpositionen
-- The checkout route writes artikelnummer but the column may not exist yet.
-- Also backfill existing rows from the artikel table.

ALTER TABLE bestellpositionen ADD COLUMN IF NOT EXISTS artikelnummer TEXT;

-- Backfill: For existing bestellpositionen that have NULL artikelnummer,
-- look up the value from the artikel table via artikel_id.
UPDATE bestellpositionen bp
SET artikelnummer = a.artikelnummer
FROM artikel a
WHERE bp.artikel_id = a.id
  AND bp.artikelnummer IS NULL
  AND a.artikelnummer IS NOT NULL;

