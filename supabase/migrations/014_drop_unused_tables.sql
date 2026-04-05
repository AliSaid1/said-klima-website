-- ============================================
-- MIGRATION 014: Drop Unused / Out-of-Scope Tables
--
-- These tables were created during early DB planning but were never implemented
-- in the application and are not planned for this project.
--
-- Run AFTER migration 013 (which enables RLS on these tables as a safety net).
-- Safe to run multiple times (DROP TABLE IF EXISTS).
-- ============================================

-- ─── 1. service_gebiete & service_gebiet_plz ─────────────────────────────────
-- Geographic service-area filtering feature — NOT in scope.
-- The company (Said Kälte- & Klimatechnik) serves a fixed local area;
-- no ZIP-code-based filtering is needed or planned.
DROP TABLE IF EXISTS service_gebiet_plz;  -- child first (FK to service_gebiete)
-- Some live DBs may have an extra junction table linking services to areas.
-- Drop known possible child tables first to avoid FK dependency errors.
DROP TABLE IF EXISTS dienstleistung_gebiete;          -- possible name used in live DB
DROP TABLE IF EXISTS dienstleistung_service_gebiete;  -- alternative naming
DROP TABLE IF EXISTS service_gebiete;


-- ─── 2. warenkoerbe & warenkorb_positionen ───────────────────────────────────
-- Server-side cart persistence — NOT needed.
-- The shopping cart is managed entirely client-side via lib/cart-context.tsx
-- (React state + localStorage).  The checkout flow goes:
--   client cart  →  POST /api/checkout  →  Stripe session  →  bestellungen
-- No intermediate DB cart is required.
DROP TABLE IF EXISTS warenkorb_positionen;  -- child first (FK to warenkoerbe)
DROP TABLE IF EXISTS warenkoerbe;

DROP TABLE IF EXISTS passwort_reset_tokens;
DROP TABLE IF EXISTS email_bestaetigung_tokens;



-- End of migration 014

