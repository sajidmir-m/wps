-- Extra exam security constraints (safe to re-run).

-- Correct option must exist inside the options array.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exam_questions_correct_in_range'
  ) THEN
    ALTER TABLE public.exam_questions
      ADD CONSTRAINT exam_questions_correct_in_range
      CHECK (correct_index < cardinality(options));
  END IF;
END $$;

-- Students must never read question rows with the anon/authenticated key.
-- Re-assert the admin-only policy and make sure no stray SELECT exists.
DROP POLICY IF EXISTS "Questions are managed by admins" ON public.exam_questions;
CREATE POLICY "Questions are managed by admins"
  ON public.exam_questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Attempts: students may only see their own row, never write via PostgREST.
DROP POLICY IF EXISTS "Attempts are managed by admins" ON public.exam_attempts;
CREATE POLICY "Attempts are managed by admins"
  ON public.exam_attempts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

DROP POLICY IF EXISTS "Students see their own attempt" ON public.exam_attempts;
CREATE POLICY "Students see their own attempt"
  ON public.exam_attempts FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Violations stay admin-only.
DROP POLICY IF EXISTS "Violations are managed by admins" ON public.exam_violations;
CREATE POLICY "Violations are managed by admins"
  ON public.exam_violations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
