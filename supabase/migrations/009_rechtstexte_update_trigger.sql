-- MIGRATION 009: Ensure rechtstexte has aktualisiert_am and trigger to update it
-- This makes sure aktualisiert_am is maintained at the DB level when rows are updated

-- Add column if missing (safely) and default to now()
ALTER TABLE IF EXISTS rechtstexte
  ADD COLUMN IF NOT EXISTS aktualisiert_am TIMESTAMPTZ NOT NULL DEFAULT now();

-- Create trigger to update aktualisiert_am on UPDATE using the common function
-- The function `update_aktualisiert_am()` is defined in migration 003.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_aktualisiert_rechtstexte'
  ) THEN
    CREATE TRIGGER set_aktualisiert_rechtstexte
      BEFORE UPDATE ON rechtstexte
      FOR EACH ROW EXECUTE FUNCTION update_aktualisiert_am();
  END IF;
END$$;

-- Note: run this migration in your Supabase project to apply the DB-side fix.

