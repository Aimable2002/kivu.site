-- ── ACADEMY SUPABASE STORAGE ──────────────────────────────────────
-- Run this in Supabase SQL Editor
-- Creates the storage bucket for book file uploads
-- Tables books and dictionary_entries already exist — do NOT run db.sql again

-- Create books storage bucket (public so download links work directly)
INSERT INTO storage.buckets (id, name, public)
VALUES ('books', 'books', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read files from the books bucket (for download)
CREATE POLICY "public read books storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'books');

-- Allow authenticated users (admin) to upload files
CREATE POLICY "admin upload books"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'books');

-- Allow authenticated users (admin) to delete files
CREATE POLICY "admin delete books"
ON storage.objects FOR DELETE
USING (bucket_id = 'books');






-- ── ACADEMY ADMIN MISSING POLICIES ───────────────────────────────
-- Run this in Supabase SQL Editor
-- The books table only had SELECT policy — admin could not insert or delete

-- Allow anyone to insert books (admin form has password protection on the frontend)
CREATE POLICY "public_insert_books"
ON books FOR INSERT
WITH CHECK (true);

-- Allow anyone to delete books (admin form has password protection on the frontend)
CREATE POLICY "public_delete_books"
ON books FOR DELETE
USING (true);

-- Allow anyone to update books (needed for download_count increment)
CREATE POLICY "public_update_books"
ON books FOR UPDATE
USING (true);

-- Same for dictionary_entries — only SELECT existed
CREATE POLICY "public_insert_dictionary"
ON dictionary_entries FOR INSERT
WITH CHECK (true);

CREATE POLICY "public_delete_dictionary"
ON dictionary_entries FOR DELETE
USING (true);


