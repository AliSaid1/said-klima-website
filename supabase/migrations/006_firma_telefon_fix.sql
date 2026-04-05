-- ============================================
-- MIGRATION 006: Firma-Spalte + Trigger-Fix
-- ============================================

-- 1. Firma-Spalte hinzufügen
ALTER TABLE benutzer
  ADD COLUMN IF NOT EXISTS firma TEXT;

-- 2. Trigger-Funktion aktualisieren (Telefon + Firma)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.benutzer (
    id,
    vorname,
    nachname,
    email,
    passwort_hash,
    telefonnummer,
    firma,
    rolle,
    email_bestaetigt
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'vorname', ''),
    COALESCE(NEW.raw_user_meta_data->>'nachname', ''),
    NEW.email,
    'supabase-auth',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'telefon', ''), NULL),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'firma', ''), NULL),
    'kunde',
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE false END
  );
  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  -- User existiert bereits — aktualisiere fehlende Felder
  UPDATE public.benutzer SET
    vorname = COALESCE(NULLIF(benutzer.vorname, ''), COALESCE(NEW.raw_user_meta_data->>'vorname', '')),
    nachname = COALESCE(NULLIF(benutzer.nachname, ''), COALESCE(NEW.raw_user_meta_data->>'nachname', '')),
    telefonnummer = COALESCE(benutzer.telefonnummer, NULLIF(NEW.raw_user_meta_data->>'telefon', '')),
    firma = COALESCE(benutzer.firma, NULLIF(NEW.raw_user_meta_data->>'firma', '')),
    email_bestaetigt = CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE benutzer.email_bestaetigt END,
    aktualisiert_am = now()
  WHERE benutzer.id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bestehende Benutzer: Telefon + Firma aus auth.users nachholen
UPDATE public.benutzer b SET
  telefonnummer = COALESCE(b.telefonnummer, NULLIF(au.raw_user_meta_data->>'telefon', '')),
  firma = COALESCE(b.firma, NULLIF(au.raw_user_meta_data->>'firma', '')),
  vorname = CASE WHEN b.vorname = '' THEN COALESCE(au.raw_user_meta_data->>'vorname', '') ELSE b.vorname END,
  nachname = CASE WHEN b.nachname = '' THEN COALESCE(au.raw_user_meta_data->>'nachname', '') ELSE b.nachname END,
  aktualisiert_am = now()
FROM auth.users au
WHERE b.id = au.id;

