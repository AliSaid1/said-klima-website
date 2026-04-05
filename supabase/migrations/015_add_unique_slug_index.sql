-- Migration: 015_add_unique_slug_index.sql
-- Purpose : Ensure a UNIQUE constraint/index exists on artikel.slug.
--
-- Context : Per DB_STRUCTURE.md the column artikel.slug already has a UNIQUE
--           constraint named `artikel_slug_key` created by migration 003.
--           This migration is therefore a no-op when run on the live DB, but
--           serves as an explicit, documented guarantee for any fresh-schema
--           environment (e.g. staging, local dev, future migrations).
--
-- Safe to run multiple times — the DO block checks before creating.

DO $$
BEGIN
  -- Only create a new index when NO unique index on artikel.slug exists yet
  -- (covers both the original `artikel_slug_key` and our own index name).
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_indexes
    WHERE  tablename = 'artikel'
      AND  indexdef  ILIKE '%unique%'
      AND  indexdef  ILIKE '%slug%'
  ) THEN
    CREATE UNIQUE INDEX idx_artikel_slug_unique ON artikel (slug);
    RAISE NOTICE 'Created unique index idx_artikel_slug_unique on artikel.slug';
  ELSE
    RAISE NOTICE 'Unique index on artikel.slug already exists — skipping';
  END IF;
END$$;
