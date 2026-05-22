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
DROP POLICY IF EXISTS "auth_read_documents"    ON storage.objects;
DROP POLICY IF EXISTS "auth_update_documents"  ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_documents"  ON storage.objects;
DROP POLICY IF EXISTS "public_read_avatars"    ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_avatars"    ON storage.objects;
DROP POLICY IF EXISTS "auth_update_avatars"    ON storage.objects;

-- Documents bucket: user upload ke folder sendiri, staff/admin bisa baca semua
CREATE POLICY "auth_upload_documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
  );

-- Admin & founder dapat upload ke path manapun (untuk bukti pencairan, dll.)
CREATE POLICY "admin_upload_documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','founder')
  );

CREATE POLICY "auth_read_documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      auth.uid()::text = (string_to_array(name, '/'))[2]
      OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('staff','admin','founder')
    )
  );

CREATE POLICY "auth_update_documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
  );

CREATE POLICY "auth_delete_documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
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
