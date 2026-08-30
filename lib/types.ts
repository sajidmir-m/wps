export type Role = "ADMIN" | "STUDENT";

export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "SUSPENDED";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

export type Profile = {
  id: string;
  email: string;
  name: string;
  role: Role;
  subscription: SubscriptionStatus;
  group_id: string | null;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type TrainingSettings = {
  id: string;
  batch_name: string;
  college_name: string;
  start_date: string;
  duration_days: number;
};

export type AttendanceRecord = {
  id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
  marked_by_id: string;
  created_at: string;
};

export type Lesson = {
  id: string;
  date: string;
  topic: string;
  method: string;
  notes: string | null;
  group_id: string | null;
  author_id: string;
  created_at: string;
};

export type Comment = {
  id: string;
  body: string;
  author_id: string;
  parent_id: string | null;
  created_at: string;
};

export type ExamStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "TERMINATED";

export type Exam = {
  id: string;
  title: string;
  instructions: string | null;
  duration_minutes: number;
  marks_correct: number;
  marks_wrong: number;
  status: ExamStatus;
  group_id: string | null;
  created_by: string;
  created_at: string;
};

export type ExamQuestion = {
  id: string;
  exam_id: string;
  position: number;
  text: string;
  options: string[];
  correct_index: number;
  created_at: string;
};

export type ExamAttempt = {
  id: string;
  exam_id: string;
  student_id: string;
  status: AttemptStatus;
  question_order: string[];
  option_orders: Record<string, number[]>;
  answers: Record<string, number>;
  started_at: string;
  ends_at: string;
  submitted_at: string | null;
  terminated_at: string | null;
  termination_reason: string | null;
  score: number | null;
  correct_count: number | null;
  wrong_count: number | null;
  unanswered_count: number | null;
};

export type ExamViolation = {
  id: string;
  attempt_id: string;
  exam_id: string;
  student_id: string;
  kind: string;
  detail: string | null;
  acknowledged: boolean;
  created_at: string;
};

/** A question as the student sees it: shuffled, and with no correct answer. */
export type PaperQuestion = {
  id: string;
  text: string;
  options: { value: number; label: string }[];
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  subscription: SubscriptionStatus;
  groupId: string | null;
};
