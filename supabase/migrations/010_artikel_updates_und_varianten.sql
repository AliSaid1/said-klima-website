-- Migration: 010_artikel_updates_und_varianten.sql
-- Purpose:
--   1. Add `ist_ab_preis` flag and `varianten` JSONB array to `artikel`.
--   2. Restructure `artikel_technische_daten`: replace key-value columns
--      (`schluessel`, `wert`) with a single rich-text column (`inhalt`).
--
-- Design decisions (see docs/DB_STRUCTURE.md for full rationale):
--   • Variants are stored as a JSONB array directly on `artikel`.
--     Each element: { "name": "50 Meter", "preis_aufschlag": 0.00 }
--     The shop JS calculates: endpreis = artikel.preis_brutto + variante.preis_aufschlag
--   • No separate `artikel_varianten` table is created.
--   • Technical data rich-text lives in `artikel_technische_daten.inhalt`,
--     NOT on the `artikel` row itself.
--
-- Safe to run multiple times (all statements are idempotent).

-- ─── 1) artikel: add ist_ab_preis ────────────────────────────────────────────
ALTER TABLE artikel
  ADD COLUMN IF NOT EXISTS ist_ab_preis BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── 2) artikel: add varianten (JSONB array of {name, preis_aufschlag}) ──────
ALTER TABLE artikel
  ADD COLUMN IF NOT EXISTS varianten JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ─── 3) artikel_technische_daten: add inhalt (rich-text HTML) ────────────────
ALTER TABLE artikel_technische_daten
  ADD COLUMN IF NOT EXISTS inhalt TEXT;

-- ─── 4) artikel_technische_daten: remove old key-value columns ───────────────
-- NOTE: The existing `schluessel`/`wert` seed data in these columns has been
-- superseded by the rich-text approach. Dropping them removes the key-value
-- UNIQUE constraint (artikel_id, schluessel) automatically.
--
-- All application code has been updated to use `inhalt` — dropping the old columns.
ALTER TABLE artikel_technische_daten DROP COLUMN IF EXISTS schluessel;
ALTER TABLE artikel_technische_daten DROP COLUMN IF EXISTS wert;

-- End of migration
