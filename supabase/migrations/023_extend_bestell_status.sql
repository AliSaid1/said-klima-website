-- Migration: Extend bestell_status ENUM type with new statuses
-- needed for Banküberweisung (bank transfer) flow.
--
-- The status column uses a PostgreSQL ENUM type called bestell_status.
-- Use ALTER TYPE ... ADD VALUE to extend it (cannot use CHECK constraints on ENUMs).
--
-- New values:
--   'warten_auf_zahlung' — checkout completed, bank transfer pending (1-5 days)
--   'fehlgeschlagen'     — async payment failed / transfer never arrived
--   'abgeschlossen'      — order fulfilled (for future use)

ALTER TYPE bestell_status ADD VALUE IF NOT EXISTS 'warten_auf_zahlung';
ALTER TYPE bestell_status ADD VALUE IF NOT EXISTS 'fehlgeschlagen';
ALTER TYPE bestell_status ADD VALUE IF NOT EXISTS 'abgeschlossen';
