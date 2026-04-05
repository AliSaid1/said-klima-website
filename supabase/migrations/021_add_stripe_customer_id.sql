-- Migration: Add stripe_customer_id to bestellungen
-- Required for Banküberweisung (bank transfer) in Stripe Checkout Sessions.
-- Stripe requires a Customer object to be attached to the session for bank transfers.
-- See: docs/plans/STRIPE_BANK_ISSUE.md

ALTER TABLE bestellungen ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Index for quick lookup when reusing customers across orders
CREATE INDEX IF NOT EXISTS idx_bestellungen_stripe_customer_id
  ON bestellungen (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

