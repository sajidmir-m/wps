-- Examination module: exams, question bank, one attempt per student, and a
-- violation log used to terminate an attempt when a student leaves the window.

CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  instructions TEXT,
  duration_minutes INT NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  marks_correct NUMERIC NOT NULL DEFAULT 1 CHECK (marks_correct > 0),
  -- Stored as a positive penalty and subtracted at grading time.
  marks_wrong NUMERIC NOT NULL DEFAULT 0.25 CHECK (marks_wrong >= 0),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED')),
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exam_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  text TEXT NOT NULL,
  options TEXT[] NOT NULL CHECK (array_length(options, 1) BETWEEN 2 AND 6),
  correct_index INT NOT NULL CHECK (correct_index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- UNIQUE (exam_id, student_id) is what makes the exam one-shot: a terminated
-- attempt still occupies the row, so a second start is rejected by the database
-- rather than by application code alone.
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS'
    CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'TERMINATED')),
  question_order UUID[] NOT NULL DEFAULT '{}',
  option_orders JSONB NOT NULL DEFAULT '{}'::jsonb,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT,
  score NUMERIC,
  correct_count INT,
  wrong_count INT,
  unanswered_count INT,
  UNIQUE (exam_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.exam_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  detail TEXT,
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON public.exam_questions(exam_id, position);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam ON public.exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student ON public.exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_violations_exam ON public.exam_violations(exam_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_violations_new ON public.exam_violations(acknowledged, created_at DESC);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_violations ENABLE ROW LEVEL SECURITY;

-- Admins manage everything. The app reaches these tables through the service
-- role after checking the session, so these policies mainly guard against a
-- student's own key being used directly against the API.
CREATE POLICY "Exams are managed by admins"
  ON public.exams FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Questions are managed by admins"
  ON public.exam_questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Attempts are managed by admins"
  ON public.exam_attempts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Violations are managed by admins"
  ON public.exam_violations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Students may see that a published exam exists and read their own attempt.
-- They are deliberately given no policy on exam_questions, so correct answers
-- are unreachable even if someone calls the API with a student token.
CREATE POLICY "Students see published exams"
  ON public.exams FOR SELECT TO authenticated
  USING (status = 'PUBLISHED');

CREATE POLICY "Students see their own attempt"
  ON public.exam_attempts FOR SELECT TO authenticated
  USING (student_id = auth.uid());
