-- ============================================================
-- Migration: Add Sakurupiah payment columns
-- Run this if you already have a payments table without these columns
-- ============================================================

-- Add Sakurupiah columns to payments table
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS sakurupiah_trx_id       TEXT,
  ADD COLUMN IF NOT EXISTS sakurupiah_ref          TEXT,
  ADD COLUMN IF NOT EXISTS sakurupiah_method       TEXT,
  ADD COLUMN IF NOT EXISTS sakurupiah_checkout_url TEXT,
  ADD COLUMN IF NOT EXISTS sakurupiah_qr_string    TEXT,
  ADD COLUMN IF NOT EXISTS sakurupiah_payment_no   TEXT,
  ADD COLUMN IF NOT EXISTS sakurupiah_expired      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sakurupiah_status       TEXT;

-- Update default payment_method to sakurupiah for new records
ALTER TABLE public.payments
  ALTER COLUMN payment_method SET DEFAULT 'sakurupiah';

-- Add index for sakurupiah lookup
CREATE INDEX IF NOT EXISTS idx_payments_sakurupiah_trx
  ON public.payments(sakurupiah_trx_id);

CREATE INDEX IF NOT EXISTS idx_payments_sakurupiah_ref
  ON public.payments(sakurupiah_ref);
