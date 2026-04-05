-- Migration: Add 'storniert' to bestell_status ENUM
-- Needed for checkout.session.expired webhook handling:
-- when a Stripe Checkout session expires without completing,
-- the order is marked as 'storniert' (cancelled).

ALTER TYPE bestell_status ADD VALUE IF NOT EXISTS 'storniert';

