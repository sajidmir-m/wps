-- Run this in the Supabase SQL Editor after 001_schema.sql.
-- Stores the generated password for each student so the admin can print login
-- slips. Supabase Auth only keeps a hash, so the readable copy lives here.
-- Readable by admins only.

CREATE TABLE IF NOT EXISTS public.student_credentials (
  student_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  password TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.student_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Credentials are admin only" ON public.student_credentials;
CREATE POLICY "Credentials are admin only"
  ON public.student_credentials
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
