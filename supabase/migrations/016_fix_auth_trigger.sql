-- ============================================================
-- MIGRATION 016: Fix auth trigger — 3 bugs in one migration
--
-- Bug 1: EXCEPTION handler used WHERE id = NEW.id (new auth ID)
--        but the violation was on the EMAIL unique constraint,
--        so the old orphaned row (different id, same email) was
--        never updated → vorname/nachname stayed empty.
--
-- Bug 2: email_bestaetigt never updated because there was no
--        AFTER UPDATE trigger on auth.users. Supabase updates
--        email_confirmed_at on the confirmation link click, but
--        our benutzer table never reflected that change.
--
-- Bug 3: firma column not stored in INSERT trigger (was in the
--        migration 006 version but dropped in 005 re-creates).
--        This migration enforces firma is always included.
--
-- Data fix: Repair the orphaned benutzer row for the test user
--           alisaid04101996@gmail.com whose auth.users.id differs
--           from the benutzer.id that the broken trigger created.
-- ============================================================

-- ─── 1. Fix handle_new_user() ────────────────────────────────────────────────
-- Strategy on email unique_violation:
--   DELETE the orphaned row (old ID, same email) and re-INSERT with the
--   correct new auth.users.id + full metadata. Any existing row with the
--   exact same id (e.g. duplicate trigger call) is silently skipped.
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
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'vorname', ''), ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nachname', ''), ''),
    NEW.email,
    'supabase-auth',
    NULLIF(NEW.raw_user_meta_data->>'telefon', ''),
    NULLIF(NEW.raw_user_meta_data->>'firma',   ''),
    'kunde',
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE false END
  );
  RETURN NEW;

EXCEPTION WHEN unique_violation THEN
  -- The email already exists from a previous (possibly deleted) auth user.
  -- Remove the stale orphaned row (different id, same email) then re-insert.
  DELETE FROM public.benutzer
  WHERE email = NEW.email
    AND id   != NEW.id;

  -- Now insert fresh (or skip if an identical id row already exists).
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
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'vorname', ''), ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nachname', ''), ''),
    NEW.email,
    'supabase-auth',
    NULLIF(NEW.raw_user_meta_data->>'telefon', ''),
    NULLIF(NEW.raw_user_meta_data->>'firma',   ''),
    'kunde',
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE false END
  )
  ON CONFLICT (id) DO UPDATE SET
    vorname       = EXCLUDED.vorname,
    nachname      = EXCLUDED.nachname,
    telefonnummer = EXCLUDED.telefonnummer,
    firma         = EXCLUDED.firma,
    email_bestaetigt = EXCLUDED.email_bestaetigt,
    aktualisiert_am  = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── 2. New: handle_user_updated() — flip email_bestaetigt on confirmation ───
CREATE OR REPLACE FUNCTION public.handle_user_updated()
RETURNS TRIGGER AS $$
BEGIN
  -- email_confirmed_at just changed from NULL → a timestamp = user confirmed email
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.benutzer
    SET    email_bestaetigt = true,
           aktualisiert_am  = now()
    WHERE  id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_updated();


-- ─── 3. One-time data fix ─────────────────────────────────────────────────────
-- Fix the orphaned benutzer row for alisaid04101996@gmail.com.
-- The real auth.users.id is 287e0f69-9811-47f1-9783-b5f936c2d978 but the
-- benutzer table has an orphaned row with id ebaab82f-b038-4665-91ba-509295b3110d
-- (no longer present in auth.users) and empty vorname/nachname.
-- We delete the orphan and insert the correct row.

-- Step 3a: Delete the orphaned row (safe — no orders/bookings linked to it)
DELETE FROM public.benutzer
WHERE email = 'alisaid04101996@gmail.com'
  AND id    = 'ebaab82f-b038-4665-91ba-509295b3110d';

-- Step 3b: Insert the correct row for the real auth user
INSERT INTO public.benutzer (
  id,
  vorname,
  nachname,
  email,
  passwort_hash,
  rolle,
  email_bestaetigt
) VALUES (
  '287e0f69-9811-47f1-9783-b5f936c2d978',
  'lukas',
  'lus',
  'alisaid04101996@gmail.com',
  'supabase-auth',
  'kunde',
  true   -- email_confirmed_at IS set for this user
)
ON CONFLICT (id) DO NOTHING;


-- ─── 4. Back-fill email_bestaetigt for ALL already-confirmed users ─────────────
-- For any benutzer whose auth.users.email_confirmed_at is already set
-- but whose email_bestaetigt is still false.
UPDATE public.benutzer b
SET    email_bestaetigt = true,
       aktualisiert_am  = now()
FROM   auth.users au
WHERE  au.id                  = b.id
  AND  au.email_confirmed_at IS NOT NULL
  AND  b.email_bestaetigt     = false;

