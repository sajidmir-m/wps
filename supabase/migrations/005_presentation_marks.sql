-- Presentation component for industrial training marks.
-- Final displayed score = exam score + presentation score (no breakdown on certificates).

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS presentation_max NUMERIC NOT NULL DEFAULT 10
  CHECK (presentation_max >= 0);

ALTER TABLE public.exam_attempts
  ADD COLUMN IF NOT EXISTS presentation_score NUMERIC
  CHECK (presentation_score IS NULL OR presentation_score >= 0);

COMMENT ON COLUMN public.exams.presentation_max IS
  'Maximum marks for the presentation part; added to exam total for combined ranking.';
COMMENT ON COLUMN public.exam_attempts.presentation_score IS
  'Presentation marks awarded by the trainer; null until entered.';
