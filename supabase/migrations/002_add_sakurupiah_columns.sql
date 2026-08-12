-- ============================================================
-- Migration: Fix storage policies, get_user_role, profile bank fields
-- Run in Supabase SQL Editor after schema.sql / storage_policies.sql
-- ============================================================

-- 1. Fix get_user_role to return 'user' instead of NULL when profile missing
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(role, 'user') FROM public.profiles WHERE id = auth.uid()
$$;

-- 2. Drop old documents storage policies (key was checking [1] = userId but path is kyc/{userId}/...)
DROP POLICY IF EXISTS "auth_upload_documents"  ON storage.objects;
DROP POLICY IF EXISTS "admin_upload_documents" ON storage.objects;
DROP POLICY IF EXISTS "auth_read_documents"    ON storage.objects;
DROP POLICY IF EXISTS "auth_update_documents"  ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_documents"  ON storage.objects;

-- 3. Re-create documents policies with correct path structure (kyc/{userId}/filename)
-- user uploads
CREATE POLICY "auth_upload_documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (string_to_array(name, '/'))[2] = auth.uid()::text
  );

-- admin/founder uploads anywhere
CREATE POLICY "admin_upload_documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), 'user') IN ('admin','founder')
  );

-- read: own files or staff+
CREATE POLICY "auth_read_documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      (string_to_array(name, '/'))[2] = auth.uid()::text
      OR COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), 'user') IN ('staff','admin','founder')
    )
  );

-- update/delete: own files only
CREATE POLICY "auth_update_documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (string_to_array(name, '/'))[2] = auth.uid()::text
  );

CREATE POLICY "auth_delete_documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (string_to_array(name, '/'))[2] = auth.uid()::text
  );

-- ============================================================
-- Sakurupiah columns (if not already added)
-- ============================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS sakurupiah_trx_id       TEXT,
  ADD COLUMN IF NOT EXISTS sakurupiah_ref          TEXT,
  ADD COLUMN IF NOT EXISTS sakurupiah_method       TEXT,
  ADD COLUMN IF NOT EXISTS sakurupiah_checkout_url TEXT,
  ADD COLUMN IF NOT EXISTS sakurupiah_qr_string    TEXT,
  ADD COLUMN IF NOT EXISTS sakurupiah_payment_no   TEXT,
  ADD COLUMN IF NOT EXISTS sakurupiah_expired     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sakurupiah_status       TEXT;

ALTER TABLE public.payments
  ALTER COLUMN payment_method SET DEFAULT 'sakurupiah';

CREATE INDEX IF NOT EXISTS idx_payments_sakurupiah_trx ON public.payments(sakurupiah_trx_id);
CREATE INDEX IF NOT EXISTS idx_payments_sakurupiah_ref ON public.payments(sakurupiah_ref);

-- ============================================================
-- Profile bank fields (pull from profile, not re-enter)
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bank_code      TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS account_name   TEXT;
