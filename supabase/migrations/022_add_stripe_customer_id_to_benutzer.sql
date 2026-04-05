-- Migration: Add stripe_customer_id to benutzer
-- Store Stripe Customer ID on user accounts to avoid creating duplicate customers
-- and to reuse the same Stripe Customer for invoices and saved payment methods.

ALTER TABLE benutzer ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_benutzer_stripe_customer_id
  ON benutzer (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

