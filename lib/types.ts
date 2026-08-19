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

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  subscription: SubscriptionStatus;
  groupId: string | null;
};
