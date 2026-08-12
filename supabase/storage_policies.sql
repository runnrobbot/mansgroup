-- ============================================================
-- STORAGE POLICIES — Jalankan TERPISAH setelah:
-- 1. Buat bucket "documents" (private) di Supabase Dashboard
--    Storage → New Bucket → name: "documents", uncheck Public
-- 2. Buat bucket "avatars" (public) di Supabase Dashboard
--    Storage → New Bucket → name: "avatars", centang Public
-- 3. Baru jalankan SQL ini
-- ============================================================

-- Hapus policy lama jika ada
DROP POLICY IF EXISTS "auth_upload_documents"  ON storage.objects;
DROP POLICY IF EXISTS "admin_upload_documents" ON storage.objects;
DROP POLICY IF EXISTS "auth_read_documents"    ON storage.objects;
DROP POLICY IF EXISTS "auth_update_documents"  ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_documents"  ON storage.objects;
DROP POLICY IF EXISTS "public_read_avatars"    ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_avatars"    ON storage.objects;
DROP POLICY IF EXISTS "auth_update_avatars"    ON storage.objects;

-- Documents bucket: user uploads to kyc/{userId}/filename, staff/admin can read all
-- Structure: kyc/{userId}/{doc_type}_{timestamp}.ext
CREATE POLICY "auth_upload_documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (string_to_array(name, '/'))[2] = auth.uid()::text
  );

-- Admin & founder can upload to any path
CREATE POLICY "admin_upload_documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), 'user') IN ('admin','founder')
  );

CREATE POLICY "auth_read_documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      (string_to_array(name, '/'))[2] = auth.uid()::text
      OR COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), 'user') IN ('staff','admin','founder')
    )
  );

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

-- Avatars bucket: semua bisa baca, authenticated bisa upload ke folder sendiri
CREATE POLICY "public_read_avatars" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "auth_upload_avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "auth_update_avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );
