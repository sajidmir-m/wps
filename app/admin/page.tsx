import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import { todayISO, formatDisplayDate } from "@/lib/dates";
import { computeStats } from "@/lib/stats";
import { Card, Shell, Stat } from "@/components/ui";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { AttendanceRecord } from "@/lib/types";

export default async function AdminHome() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const today = todayISO();

  const [studentsData, groupsData, lessonsData, commentsData, allAttendanceData] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("id, name, group_id").eq("role", "STUDENT").order("name", { ascending: true }),
      supabaseAdmin.from("groups").select("id, name").order("name", { ascending: true }),
      supabaseAdmin
        .from("lessons")
        .select("id, date, topic, method, groups(name)")
        .order("date", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("comments")
        .select("id, body, profiles(name)")
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(5),
      supabaseAdmin.from("attendance").select("student_id, date, status"),
    ]);

  const students = (studentsData.data || []) as { id: string; name: string; group_id: string | null }[];
  const groups = (groupsData.data || []) as { id: string; name: string }[];
  const lessons = (lessonsData.data || []) as {
    id: string;
    date: string;
    topic: string;
    method: string;
    groups: { name: string } | { name: string }[] | null;
  }[];
  const comments = (commentsData.data || []) as {
    id: string;
    body: string;
    profiles: { name: string } | { name: string }[] | null;
  }[];
  const allAttendance = (allAttendanceData.data || []) as AttendanceRecord[];
  const attendance = allAttendance.filter((a) => a.date === today);

  const byStudent = new Map<string, AttendanceRecord[]>();
  for (const record of allAttendance) {
    const list = byStudent.get(record.student_id);
    if (list) list.push(record);
    else byStudent.set(record.student_id, [record]);
  }

  const stats = students.map((s) => computeStats(byStudent.get(s.id) || []));
  const withMarks = stats.filter((s) => s.marked > 0);
  const avg =
    withMarks.length === 0
      ? 0
      : Math.round((withMarks.reduce((sum, s) => sum + s.percent, 0) / withMarks.length) * 10) / 10;
  const neverAbsent = stats.filter((s) => s.continuous && s.marked > 0).length;
  const todayPresent = attendance.filter((a) => a.status !== "ABSENT").length;

  function relationName(value: { name: string } | { name: string }[] | null) {
    if (!value) return null;
    return Array.isArray(value) ? value[0]?.name ?? null : value.name;
  }

  return (
    <Shell
      role="ADMIN"
      name={admin.name}
      title="Admin dashboard"
      subtitle="Womans Polytechnic College Srinagar"
    >
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Students" value={students.length} hint={`${groups.length} groups`} />
        <Stat
          label="Present today"
          value={attendance.length ? todayPresent : "—"}
          hint={formatDisplayDate(today)}
        />
        <Stat
          label="Average attendance"
          value={withMarks.length ? `${avg}%` : "—"}
          hint="Across all marked days"
        />
        <Stat label="Never absent" value={neverAbsent} hint="No absence so far" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl">Groups</h2>
            <Link href="/admin/students" className="text-sm text-primary font-medium">
              Manage students
            </Link>
          </div>
          <ul className="space-y-2">
            {groups.map((g) => {
              const count = students.filter((s) => s.group_id === g.id).length;
              return (
                <li
                  key={g.id}
                  className="flex items-center justify-between rounded-xl bg-off-white px-3 py-2"
                >
                  <span>{g.name}</span>
                  <span className="text-sm text-muted">{count} students</span>
                </li>
              );
            })}
            {!groups.length ? <p className="text-sm text-muted">No groups yet.</p> : null}
          </ul>
        </Card>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl">Latest lessons</h2>
            <Link href="/admin/lessons" className="text-sm text-primary font-medium">
              Add lesson
            </Link>
          </div>
          <ul className="space-y-3">
            {lessons.map((l) => (
              <li key={l.id}>
                <p className="font-medium">{l.topic}</p>
                <p className="text-sm text-muted">
                  {l.date} · {l.method}
                  {relationName(l.groups) ? ` · ${relationName(l.groups)}` : " · All groups"}
                </p>
              </li>
            ))}
            {!lessons.length ? (
              <p className="text-sm text-muted">No lessons logged yet.</p>
            ) : null}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">Recent questions</h2>
          <Link href="/admin/comments" className="text-sm text-primary font-medium">
            Open inbox
          </Link>
        </div>
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl bg-off-white px-3 py-2">
              <p className="text-sm">{c.body}</p>
              <p className="mt-1 text-xs text-muted">{relationName(c.profiles)}</p>
            </li>
          ))}
          {!comments.length ? (
            <p className="text-sm text-muted">No questions yet.</p>
          ) : null}
        </ul>
      </Card>
    </Shell>
  );
}
