-- ============================================
-- MIGRATION 005: Auth-Trigger für benutzer-Tabelle
-- Erstellt automatisch einen Eintrag in der benutzer-Tabelle
-- wenn sich ein neuer User über Supabase Auth registriert.
-- ============================================

-- Funktion: Wird bei jedem neuen Auth-User aufgerufen
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
    rolle,
    email_bestaetigt
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'vorname', ''),
    COALESCE(NEW.raw_user_meta_data->>'nachname', ''),
    NEW.email,
    'supabase-auth',  -- Passwort wird von Supabase Auth verwaltet
    COALESCE(NEW.raw_user_meta_data->>'telefon', NULL),
    'kunde',
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE false END
  );
  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  -- User existiert bereits in benutzer-Tabelle, ignorieren
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Wird nach INSERT auf auth.users ausgeführt
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Optional: Bestehende Auth-User nachholen
-- Falls bereits User in auth.users existieren,
-- die noch keinen benutzer-Eintrag haben
-- ============================================
INSERT INTO public.benutzer (id, vorname, nachname, email, passwort_hash, rolle, email_bestaetigt)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'vorname', ''),
  COALESCE(au.raw_user_meta_data->>'nachname', ''),
  au.email,
  'supabase-auth',
  'kunde',
  CASE WHEN au.email_confirmed_at IS NOT NULL THEN true ELSE false END
FROM auth.users au
LEFT JOIN public.benutzer b ON b.id = au.id
WHERE b.id IS NULL;

